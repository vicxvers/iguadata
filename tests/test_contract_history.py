"""Regression coverage for the public last-known contract snapshot."""

import io
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))

import fetch_contractes_socrata as fetcher
import generate_electoralisme
import validate_contractes_snapshot as guard
from contract_filters import is_analysis_contract, is_live_contract
from contract_history import HISTORY_STATE, merge_snapshot


def contract(code="EXP-1", **changes):
    row = dict(id=1, codigo=code, organismo="Ajuntament d'Igualada", tipo="5. SERVEIS",
               procedimiento="Menor", descripcion="Servei de prova", importe=1000,
               adjudicatario="PROVA SL", fecha="2021-01-01", mes=1, cpv="79000000",
               numero_lot="", contracte_origen="Servei de prova", estat_font="actiu_socrata",
               preservat_iguadata=False, exclos_analisis=False)
    row["año"] = 2021
    return dict(row, **changes)


def event(row, detected="2026-05-14", kind="desaparegut"):
    return dict(tipus_canvi=kind, detectat_a=detected, contracte_original=row,
                exclos_analisis=True)


class ContractHistoryTests(unittest.TestCase):
    def temporary_directory(self):
        root = ROOT / ".dev" / "outputs"
        root.mkdir(parents=True, exist_ok=True)
        return tempfile.TemporaryDirectory(dir=root)

    def merge(self, previous, fresh, archive=(), date="2026-10-31"):
        return merge_snapshot(previous, fresh, observed_on=date, legacy_archive=archive)

    def test_missing_contract_keeps_original_values_and_first_absence(self):
        original = contract(ultima_presencia_socrata="2026-10-05")
        first = self.merge([original], [])
        historical = first[0]
        self.assertEqual(historical["importe"], original["importe"])
        self.assertEqual(historical["descripcion"], original["descripcion"])
        self.assertEqual(historical["id"], original["id"])
        self.assertEqual(historical["ultima_presencia_socrata"], "2026-10-05")
        self.assertEqual(historical["primera_absencia_detectada"], "2026-10-31")
        self.assertTrue(is_analysis_contract(historical))
        self.assertFalse(is_live_contract(historical))
        self.assertEqual(self.merge(first, [], date="2026-11-07"), first)
        self.assertFalse(original["preservat_iguadata"])

    def test_correction_replaces_previous_version_even_if_source_title_changes(self):
        original = contract()
        corrected = contract(importe=1200, descripcion="Descripció corregida",
                             contracte_origen="Títol corregit")
        result = self.merge([original], [corrected], [event(original)])
        self.assertEqual(len(result), 1)
        self.assertEqual((result[0]["importe"], result[0]["id"]), (1200, original["id"]))
        self.assertTrue(is_live_contract(result[0]))

    def test_reappearance_restores_source_status_without_an_extra_contract(self):
        historical = self.merge([contract()], [])[0]
        result = self.merge([historical], [contract(importe=900)], [event(contract())])
        self.assertEqual(len(result), 1)
        self.assertTrue(is_live_contract(result[0]))
        self.assertNotIn("primera_absencia_detectada", result[0])
        self.assertEqual(result[0]["ultima_presencia_socrata"], "2026-10-31")

    def test_source_row_identifier_tracks_a_corrected_expediente_or_lot(self):
        before = contract(id_socrata="row-stable", numero_lot="1")
        after = contract("CODE-CORRECTED", id_socrata="row-stable", numero_lot="2", importe=1200)
        rows = self.merge([before], [after])
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]["codigo"], rows[0]["id"]), ("CODE-CORRECTED", before["id"]))
        result, report = self.run_guard([before], rows)
        self.assertEqual(result, 0)
        self.assertEqual(report["summary"]["source_absences"], 0)

    def test_organisms_and_lots_are_preserved_independently(self):
        previous = [contract(numero_lot="1"), contract(id=2, numero_lot="2"),
                    contract(id=3, organismo="Consorci Sociosanitari d'Igualada", numero_lot="1")]
        result = self.merge(previous, [contract(numero_lot="1", importe=1100)])
        self.assertEqual(len(result), 3)
        self.assertEqual(sum(not is_live_contract(row) for row in result), 2)
        self.assertEqual(sum(row["importe"] for row in result), 3100)
        self.assertEqual(len({row["id"] for row in result}), 3)

    def test_distinct_rows_of_the_same_source_group_are_not_guessed_as_revisions(self):
        rows = [contract(id=7), contract(id=8, fecha="2021-02-01", importe=1200)]
        retained = self.merge(rows, [])
        self.assertEqual(len(retained), 2)
        self.assertEqual({row["id"] for row in retained}, {7, 8})
        current = self.merge(rows, [contract(fecha="2021-02-01", importe=1200)])
        self.assertEqual(len(current), 1)
        self.assertEqual(current[0]["id"], 8)

    def test_new_contracts_do_not_reassign_existing_ids(self):
        result = self.merge([contract(id=7)], [contract("NEW", id=1), contract(id=2)])
        ids = {row["codigo"]: row["id"] for row in result}
        self.assertEqual(ids, {"NEW": 8, "EXP-1": 7})

    def test_legacy_import_keeps_latest_absent_original_and_never_a_corrected_version(self):
        missing = contract("OLD", importe=900)
        original = contract("CHANGED")
        archive = [event(contract("OLD", importe=100)), event(missing, "2026-06-01"),
                   event(original, kind="modificat"), event(original), event(contract("ACTIVE"))]
        previous = [contract("ACTIVE", importe=1200)]
        result = self.merge(previous, previous, archive, date=None)
        self.assertEqual({row["codigo"] for row in result}, {"OLD", "ACTIVE"})
        old = next(row for row in result if row["codigo"] == "OLD")
        self.assertEqual((old["importe"], old["primera_absencia_detectada"]), (900, "2026-06-01"))
        self.assertNotIn("ultima_presencia_socrata", old)
        self.assertEqual(self.merge(result, previous, archive, date=None), result)

    def test_legacy_lot_backfill_does_not_duplicate_the_old_aggregate(self):
        old = contract()
        for field in ("cpv", "numero_lot", "contracte_origen"):
            old.pop(field)
        fresh = [contract(numero_lot="1"), contract(id=2, numero_lot="2")]
        result = self.merge([], fresh, [event(old)])
        self.assertEqual(len(result), 2)

    def test_explicit_exclusions_remain_excluded_and_are_not_imported(self):
        excluded = contract(exclos_analisis=True)
        self.assertEqual(self.merge([excluded], []), [])
        self.assertEqual(self.merge([], [], [event(excluded)]), [])
        self.assertFalse(is_analysis_contract(self.merge([excluded], [contract()])[0]))

    def run_guard(self, old, new):
        with self.temporary_directory() as directory:
            root = Path(directory)
            old_path, new_path, report_path = [root / name for name in ("old.json", "new.json", "report.json")]
            old_path.write_text(json.dumps(old), encoding="utf-8")
            new_path.write_text(json.dumps(new), encoding="utf-8")
            args = ["guard", "--old", str(old_path), "--new", str(new_path),
                    "--max-missing-contracts", "0", "--report", str(report_path)]
            with patch.object(sys, "argv", args), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                result = guard.main()
            return result, json.loads(report_path.read_text(encoding="utf-8"))

    def test_guard_accepts_more_than_fifty_absences_when_preserved_below_mass_drop_limit(self):
        old = [contract(str(index), id=index + 1) for index in range(2000)]
        result, report = self.run_guard(old, self.merge(old, old[60:]))
        self.assertEqual(result, 0)
        self.assertEqual(report["summary"]["source_absences"], 60)
        self.assertEqual(report["summary"]["missing_keys"], 0)

    def test_guard_rejects_missing_or_altered_historical_evidence(self):
        old = [contract(str(index), id=index + 1) for index in range(100)]
        retained = self.merge(old, old[1:])
        historical = next(row for row in retained if row["preservat_iguadata"])
        historical["importe"] = 500
        result, report = self.run_guard(old, retained)
        self.assertEqual(result, 1)
        self.assertEqual(report["summary"]["missing_keys"], 1)
        result, _ = self.run_guard(old, old[1:])
        self.assertEqual(result, 1)

    def test_guard_rejects_a_mass_source_drop_even_when_all_originals_are_retained(self):
        old = [contract(str(index), id=index + 1) for index in range(100)]
        result, report = self.run_guard(old, self.merge(old, old[20:]))
        self.assertEqual(result, 1)
        self.assertEqual(report["summary"]["missing_keys"], 0)
        self.assertTrue(any("disappeared" in failure for failure in report["failures"]))

    def test_guard_rejects_an_empty_source_even_with_a_complete_history(self):
        result, _ = self.run_guard([contract()], self.merge([contract()], []))
        self.assertEqual(result, 1)

    def test_guard_accepts_corrections_and_legacy_lot_backfills(self):
        old = [contract(str(index), id=index + 1) for index in range(100)]
        fresh = [dict(row, numero_lot="1", contracte_origen="Títol actualitzat") for row in old]
        result, report = self.run_guard(old, self.merge(old, fresh))
        self.assertEqual(result, 0)
        self.assertEqual(report["summary"]["source_absences"], 0)

    def test_incomplete_and_repeated_pages_are_rejected(self):
        page = [dict(id_socrata="row-a", codi_expedient="EXP-1")]
        with patch.object(fetcher, "fer_peticio", side_effect=[[{"total": "2"}], page]):
            with self.assertRaisesRegex(RuntimeError, "incompleta"):
                fetcher.descarregar_contractes()
        with patch.object(fetcher, "LIMIT", 1), patch.object(fetcher, "fer_peticio",
                side_effect=[[{"total": "2"}], page, page]):
            with self.assertRaisesRegex(RuntimeError, "repetit"):
                fetcher.descarregar_contractes()

    def test_source_change_during_download_is_rejected(self):
        page = [dict(id_socrata="row-a", codi_expedient="EXP-1")]
        with patch.object(fetcher, "fer_peticio", side_effect=[[{"total": "1"}], page, [{"total": "2"}]]):
            with self.assertRaisesRegex(RuntimeError, "modificada"):
                fetcher.descarregar_contractes()

    def test_failed_download_does_not_write_any_snapshot_or_audit_file(self):
        with self.temporary_directory() as directory:
            root = Path(directory)
            paths = [root / name for name in ("contractes.json", "archive.json", "changes.json")]
            for path, payload in zip(paths, [[contract()], [], []]):
                path.write_text(json.dumps(payload), encoding="utf-8")
            before = [path.read_bytes() for path in paths]
            with patch.multiple(fetcher, OUTPUT_FILE=str(paths[0]), ARCHIVE_FILE=str(paths[1]),
                    CHANGELOG_FILE=str(paths[2])), patch.object(fetcher, "descarregar_contractes",
                    side_effect=RuntimeError("download failed")), patch.object(sys, "argv", ["fetcher"]), \
                    redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(RuntimeError, "download failed"):
                    fetcher.main()
            self.assertEqual([path.read_bytes() for path in paths], before)

    def test_corrupt_previous_snapshot_is_not_silently_treated_as_empty(self):
        with self.temporary_directory() as directory:
            path = Path(directory) / "contractes.json"
            path.write_text("invalid json", encoding="utf-8")
            with self.assertRaises(json.JSONDecodeError):
                fetcher.carregar_json_array(str(path))

    def test_fetcher_keeps_company_totals_and_audit_events_coherent_across_runs(self):
        with self.temporary_directory() as directory:
            root = Path(directory)
            (root / "json").mkdir()
            contracts_path = root / "json" / "contractes.json"
            archive_path, changes_path = root / "archive.json", root / "changes.json"
            contracts_path.write_text(json.dumps([contract("KEEP"), contract("GONE", id=2)]), encoding="utf-8")
            archive_path.write_text("[]", encoding="utf-8")
            changes_path.write_text("[]", encoding="utf-8")

            def update(fresh):
                with patch.multiple(fetcher, BASE_DIR=str(root), OUTPUT_FILE=str(contracts_path),
                        ARCHIVE_FILE=str(archive_path), CHANGELOG_FILE=str(changes_path)), \
                        patch.object(fetcher, "descarregar_contractes", return_value=fresh), \
                        patch.object(sys, "argv", ["fetcher"]), redirect_stdout(io.StringIO()):
                    fetcher.main()
                return json.loads(contracts_path.read_text(encoding="utf-8"))

            fresh = [contract("KEEP", importe=1200, contracte_origen="Títol corregit")]
            rows = update(fresh)
            self.assertEqual((len(rows), sum(row["importe"] for row in rows)), (2, 2200))
            companies = json.loads((root / "json" / "empreses.json").read_text(encoding="utf-8"))
            self.assertEqual((companies[0]["num_contratos"], companies[0]["total_importe"]), (2, 2200))
            events = json.loads(archive_path.read_text(encoding="utf-8"))
            self.assertEqual({row["tipus_canvi"] for row in events}, {"modificat", "desaparegut"})
            self.assertEqual(update(fresh), rows)
            self.assertEqual(json.loads(archive_path.read_text(encoding="utf-8")), events)
            reappeared = update(fresh + [contract("GONE", importe=900)])
            self.assertEqual(len(reappeared), 2)
            self.assertTrue(all(is_live_contract(row) for row in reappeared))
            self.assertEqual(len(json.loads(archive_path.read_text(encoding="utf-8"))), 3)

    def test_real_analysis_export_includes_history_and_excludes_audit_versions(self):
        rows = [contract("LIVE", fecha="2023-06-15", descripcion="Monòlits i rètols per a l'ampliació del Parc Central"),
                contract("HISTORY", id=2, fecha="2023-06-15", descripcion="Monòlits i rètols per a l'ampliació del Parc Central",
                         estat_font=HISTORY_STATE, preservat_iguadata=True),
                contract("AUDIT", id=3, fecha="2023-06-15", descripcion="Monòlits i rètols per a l'ampliació del Parc Central",
                         exclos_analisis=True)]
        with self.temporary_directory() as directory:
            source, output = Path(directory) / "contracts.json", Path(directory) / "analysis.json"
            source.write_text(json.dumps(rows), encoding="utf-8")
            with patch.object(sys, "argv", ["analysis", "--contractes", str(source), "--output", str(output)]), \
                    redirect_stdout(io.StringIO()):
                generate_electoralisme.main()
            cases = json.loads(output.read_text(encoding="utf-8"))["alertes"]
        exported = {row["codigo"]: row for case in cases for row in case["contractes"]}
        self.assertEqual(set(exported), {"LIVE", "HISTORY"})
        self.assertTrue(exported["HISTORY"]["preservat_iguadata"])

    def test_frontend_lists_and_counts_history_and_reuses_the_preservation_notice(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        script = r"""
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const fixture = JSON.parse(process.argv[1]);
const context = {
 console, URLSearchParams, setTimeout, clearTimeout,
 window: {location: {pathname: '/', search: '', href: 'http://localhost:8080/'}, __IGUADATA_BASE__: ''},
 document: {getElementById: () => ({})}, navigator: {},
 React: {createElement: (tag, props, ...children) => ({tag, props, children}),
   useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
   useRef: () => ({current: null}), useMemo: fn => fn(), useEffect: () => {}},
 ReactDOM: {createRoot: () => ({render: () => {}})},
 fetch: async url => ({ok: true, json: async () => url.includes('contractes.json') ? fixture
   : url.includes('empreses.json') ? [] : {aliases: {}}}),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8'), context);
(async () => {
 const core = await context.fetchCoreData();
 assert.equal(core.contracts.length, 2);
 assert.equal(core.stats.importe_total, 2200);
 assert.equal(core.empreses[0].num_contratos, 2);
 const historical = core.contracts.find(row => row.preservat_iguadata);
 const notice = 'Aquest contracte ja no està disponible al Registre Públic de Contractes. La fitxa es preserva per mantenir la traçabilitat de les dades.';
 const tree = context.ContractDetailView({contract: historical, empreses: core.empreses});
 assert(JSON.stringify(tree).includes(notice));
 const current = core.contracts.find(row => !row.preservat_iguadata);
 assert(!JSON.stringify(context.ContractDetailView({contract: current, empreses: core.empreses})).includes(notice));
 const original = {...current, id: 7};
 const originalSlug = context.prepareContracts([original])[0].slug;
 const withHistory = context.prepareContracts([{...original}, {...original, id: 8, organismo: 'Consorci', preservat_iguadata: true}]);
 assert.equal(withHistory.find(row => context.contractMatchesSlug(row, originalSlug)).id, 7);
})().catch(error => {console.error(error); process.exitCode = 1;});
"""
        fixture = [contract("LIVE"), contract("HISTORY", id=2, importe=1200,
                    estat_font=HISTORY_STATE, preservat_iguadata=True),
                   contract("AUDIT", id=3, exclos_analisis=True)]
        result = subprocess.run([node, "-e", script, json.dumps(fixture)], cwd=ROOT,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()

import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / ".github" / "scripts"
sys.path.insert(0, str(SCRIPTS))


def temporary_root() -> Path:
    root = Path(__file__).resolve().parents[1] / ".dev" / "outputs"
    root.mkdir(parents=True, exist_ok=True)
    return root

from atomic_io import write_json_atomic
from contract_filters import is_analysis_contract
from contract_audit import change_id, contract_differences, identity_key
from freeze_investigacio_contracts import freeze
from generate_audit_impact import enrich_changes
import generate_electoralisme
import generate_fraccionament
import validate_contractes_snapshot


class DataPipelineTests(unittest.TestCase):
    def test_archived_contracts_are_never_analysed(self):
        self.assertTrue(is_analysis_contract({"estat_font": "actiu_socrata"}))
        self.assertFalse(is_analysis_contract({"preservat_iguadata": True}))
        self.assertFalse(is_analysis_contract({"exclos_analisis": True}))
        self.assertFalse(is_analysis_contract({"estat_font": "preservat_desaparegut_socrata"}))

    def test_snapshot_guard_compares_live_contracts_only(self):
        rows = [
            {"codigo": "LIVE", "estat_font": "actiu_socrata"},
            {"codigo": "OLD", "preservat_iguadata": True},
        ]
        with tempfile.TemporaryDirectory(dir=temporary_root()) as directory:
            path = Path(directory) / "contractes.json"
            path.write_text(json.dumps(rows), encoding="utf-8")
            loaded = validate_contractes_snapshot.load_contracts(str(path))
        self.assertEqual([row["codigo"] for row in loaded], ["LIVE"])

    def test_snapshot_guard_report_lists_missing_contracts(self):
        old_rows = [
            {
                "codigo": "42/2026",
                "organismo": "Ajuntament d'Igualada",
                "fecha": "2026-01-02",
                "importe": 125,
            }
        ]
        with tempfile.TemporaryDirectory(dir=temporary_root()) as directory:
            directory = Path(directory)
            old_path = directory / "old.json"
            new_path = directory / "new.json"
            report_path = directory / "report.json"
            old_path.write_text(json.dumps(old_rows), encoding="utf-8")
            new_path.write_text("[]", encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS / "validate_contractes_snapshot.py"),
                    "--old",
                    str(old_path),
                    "--new",
                    str(new_path),
                    "--max-missing-contracts",
                    "0",
                    "--report",
                    str(report_path),
                ],
                capture_output=True,
                text=True,
            )
            report = json.loads(report_path.read_text(encoding="utf-8"))

        self.assertEqual(result.returncode, 1)
        self.assertEqual(report["status"], "blocked")
        self.assertEqual(report["summary"]["missing_keys"], 1)
        self.assertEqual(report["missing_contracts"], old_rows)

    def test_2027_municipal_election_date(self):
        self.assertIn(date(2027, 5, 23), generate_electoralisme.MUNICIPAL_ELECTION_DATES)
        self.assertNotIn(date(2027, 5, 30), generate_electoralisme.MUNICIPAL_ELECTION_DATES)

    def test_expedient_key_includes_contracting_body(self):
        first = generate_fraccionament.expediente_key(
            {"codigo": "32/2026", "organismo": "Ajuntament d'Igualada"}
        )
        second = generate_fraccionament.expediente_key(
            {"codigo": "32/2026", "organismo": "Consorci Sociosanitari d'Igualada"}
        )
        self.assertNotEqual(first, second)

    def test_atomic_json_write_leaves_no_temporary_files(self):
        with tempfile.TemporaryDirectory(dir=temporary_root()) as directory:
            destination = Path(directory) / "data.json"
            write_json_atomic(destination, {"ok": True})
            self.assertEqual(json.loads(destination.read_text(encoding="utf-8")), {"ok": True})
            self.assertEqual(list(Path(directory).glob("*.tmp")), [])

    def test_contract_modification_is_detected_with_stable_id(self):
        before = {"codigo": "42/2026", "organismo": "Ajuntament", "adjudicatario": "ACME", "importe": 100}
        after = dict(before, importe=125)
        self.assertEqual(identity_key(before), identity_key(after))
        self.assertEqual(contract_differences(before, after), [{"camp": "importe", "abans": "100.00", "despres": "125.00"}])
        self.assertEqual(change_id("modificat", before, after), change_id("modificat", before, after))

    def test_contract_identity_separates_contracting_bodies(self):
        base = {"codigo": "42/2026", "adjudicatario": "ACME"}
        self.assertNotEqual(identity_key(dict(base, organismo="Ajuntament")), identity_key(dict(base, organismo="Consorci")))
        self.assertEqual(
            identity_key(dict(base, organismo="Ajuntament", adjudicatario="ALTRE")),
            identity_key(dict(base, organismo="Ajuntament")),
        )

    def test_investigation_evidence_is_frozen(self):
        investigations = [{"slug": "cas", "content": [{"type": "contracts", "slugs": ["2026-01-02-exp-1"]}]}]
        contracts = [{"codigo": "EXP/1", "fecha": "2026-01-02", "importe": 10}]
        result, changed, unresolved = freeze(investigations, contracts, [], "2026-07-13")
        snapshot = result[0]["content"][0]["contract_snapshots"][0]
        self.assertEqual((changed, unresolved), (1, []))
        self.assertTrue(snapshot["evidencia_congelada"])

    def test_audit_impact_preserves_alert_and_investigation(self):
        contract = {"codigo": "X", "fecha": "2026-01-01", "importe": 10, "adjudicatario": "ACME"}
        changes = [{"contracte_anterior": contract, "impacte_calculat": False}]
        key = ("X", "2026-01-01", "10.00", "ACME")
        updated = enrich_changes(changes, {key: [{"analisi": "fraccionament", "alerta": {"id": 1}}]}, {key: {"cas"}})
        self.assertEqual(updated, 1)
        self.assertEqual(changes[0]["investigacions_afectades"], ["cas"])
        self.assertTrue(changes[0]["alertes_afectades"])

    def test_operational_audit_is_not_in_the_public_json_tree(self):
        audit_dir = ROOT / ".github" / "audit"
        for name in ("contractes_arxiu.json", "canvis_contractes.json"):
            internal_path = audit_dir / name
            self.assertTrue(internal_path.is_file())
            self.assertFalse((ROOT / "json" / name).exists())
            self.assertIsInstance(json.loads(internal_path.read_text(encoding="utf-8")), list)

    def test_frontend_uses_the_coherent_snapshot_only(self):
        source_files = json.loads((ROOT / "src" / "app.sources.json").read_text(encoding="utf-8"))
        source = "\n".join((ROOT / path).read_text(encoding="utf-8") for path in source_files)
        self.assertIn("fetchContractsSnapshot", source)
        self.assertNotIn("SOCRATA_BASE", source)
        self.assertNotIn("fetchArchivedContracts", source)

    def test_frontend_source_manifest_is_valid(self):
        source_files = json.loads((ROOT / "src" / "app.sources.json").read_text(encoding="utf-8"))
        self.assertEqual(len(source_files), len(set(source_files)))
        self.assertIn("src/app.jsx", source_files)
        self.assertIn("src/core/runtime.js", source_files)
        self.assertIn("src/data/use-iguadata-data.js", source_files)
        self.assertIn("src/ui/primitives.jsx", source_files)
        for source_file in source_files:
            source_path = (ROOT / source_file).resolve()
            self.assertTrue(source_path.is_relative_to((ROOT / "src").resolve()))
            self.assertTrue(source_path.is_file())

        app_source = (ROOT / "src" / "app.jsx").read_text(encoding="utf-8")
        primitives_source = (ROOT / "src" / "ui" / "primitives.jsx").read_text(encoding="utf-8")
        self.assertIn("function Pagination(", primitives_source)
        self.assertIn("function EmptySearchState(", primitives_source)
        self.assertIn("function SearchField(", primitives_source)
        self.assertNotIn('className="pagination"', app_source)
        self.assertNotIn('className="search-input-wrapper"', app_source)
        self.assertNotIn("style={{ flex: '1 1 200px' }}", app_source)
        self.assertNotIn("style={{ flex: '1 1 240px' }}", app_source)
        self.assertNotIn("style={{ height: '48px' }}", app_source)

        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn('.search-section .filter-input[type="date"]', styles)
        self.assertIn('::-webkit-date-and-time-value', styles)
        self.assertIn("max-width: 100%;", styles)

    def test_home_does_not_request_route_specific_datasets(self):
        source = (ROOT / "src" / "data" / "use-iguadata-data.js").read_text(encoding="utf-8")
        self.assertIn("if (!summaryResolved || !requiresCoreData || coreDataLoaded) return;", source)
        self.assertIn("if (!summaryResolved || !ANALYSIS_TABS.includes(activeTab) || analisiLoaded) return;", source)
        self.assertIn("if (!INVESTIGATION_TABS.includes(activeTab) || investigacioLoaded) return;", source)

    def test_project_config_drives_generated_pages_and_frontend(self):
        config = json.loads((ROOT / "config" / "project.json").read_text(encoding="utf-8"))
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        app_bundle = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
        self.assertIn(f'<link rel="canonical" href="{config["site"]["url"]}/">', index_html)
        self.assertIn(f'content="{config["brand"]["name"]}"', index_html)
        self.assertIn(f'"contactEmail": "{config["site"]["contactEmail"]}"', app_bundle)

    def test_local_server_supports_spa_fallback_and_blocks_sources(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]

        creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        process = subprocess.Popen(
            [node, str(ROOT / "scripts" / "dev-server.js"), "--port", str(port)],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            creationflags=creation_flags,
        )
        try:
            dynamic_url = f"http://127.0.0.1:{port}/contractes/prova-directa"
            for _ in range(30):
                try:
                    with urllib.request.urlopen(dynamic_url, timeout=1) as response:
                        body = response.read().decode("utf-8")
                        self.assertEqual(response.status, 200)
                        self.assertIn('<div id="root"', body)
                        self.assertNotIn("upgrade-insecure-requests", body)
                        break
                except urllib.error.URLError:
                    if process.poll() is not None:
                        self.fail(process.stderr.read().decode("utf-8", errors="replace"))
                    time.sleep(0.05)
            else:
                self.fail("El servidor local no ha respost.")

            with self.assertRaises(urllib.error.HTTPError) as blocked:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/src/app.jsx", timeout=1)
            self.assertEqual(blocked.exception.code, 404)
        finally:
            process.terminate()
            process.wait(timeout=5)
            process.stderr.close()

    def test_frontend_data_matches_versioned_schema(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        result = subprocess.run(
            [node, str(ROOT / "scripts" / "validate-frontend-data.js")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_investigation_images_have_optimized_social_previews(self):
        assets = ROOT / "assets" / "investigacio"
        webp_stems = {path.stem for path in assets.glob("*.webp")}
        social_files = list(assets.glob("*-og.jpg"))
        social_stems = {path.stem.removesuffix("-og") for path in social_files}
        self.assertEqual(webp_stems, social_stems)
        self.assertEqual(list(assets.glob("*.png")), [])
        self.assertLess(sum(path.stat().st_size for path in social_files), 2_000_000)

    def test_favicon_is_compact(self):
        favicon = ROOT / "favicon.ico"
        self.assertTrue(favicon.is_file())
        self.assertLess(favicon.stat().st_size, 50_000)

    def test_spa_fallback_keeps_assets_rooted_before_rewriting_the_url(self):
        bootstrap = (ROOT / "assets" / "bootstrap.js").read_text(encoding="utf-8")
        self.assertIn("document.createElement('base')", bootstrap)
        self.assertLess(bootstrap.index("document.createElement('base')"), bootstrap.index("history.replaceState"))
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        for relative_path in ("assets/bootstrap.js", "assets/app.js", "styles.css"):
            expected_version = hashlib.sha256((ROOT / relative_path).read_bytes()).hexdigest()[:12]
            self.assertIn(f'{relative_path}?v={expected_version}', index)
        fallback = (ROOT / "404.html").read_text(encoding="utf-8")
        self.assertIn("script-src 'sha256-", fallback)
        self.assertIn("location.pathname.split", fallback)
        self.assertFalse((ROOT / "assets" / "spa-redirect.js").exists())


if __name__ == "__main__":
    unittest.main()

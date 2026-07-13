import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / ".github" / "scripts"
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


if __name__ == "__main__":
    unittest.main()

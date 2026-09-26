import json
import unittest
from pathlib import Path


class DohaDataTests(unittest.TestCase):
    def test_local_dataset_contains_full_repo_corpus(self):
        data_path = Path(__file__).resolve().parents[1] / "data" / "doha_data.json"
        self.assertTrue(data_path.exists(), "Expected doha dataset file to exist.")

        with data_path.open("r", encoding="utf-8") as handle:
            dataset = json.load(handle)

        self.assertIsInstance(dataset, list)
        self.assertGreater(len(dataset), 500, "Dataset should include the full repo corpus, not a short sample.")
        self.assertTrue(all("doha" in item and "meaning" in item for item in dataset))
        self.assertTrue(all(item["doha"].strip() for item in dataset))


if __name__ == "__main__":
    unittest.main()

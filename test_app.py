#!/usr/bin/env python3
"""
Automated verification test suite for USPS Pulse.
Validates datasets, file presence, CSV schema integrity, and HTTP serving.
"""

import json
import csv
import os
import sys

BASE_DIR = "/Users/benz/.gemini/antigravity/scratch/usps-pulse"

def run_tests():
    passed = 0
    total = 0

    print("Running USPS Pulse Verification Tests...\n")

    # Test 1: Check required files exist
    required_files = [
        "index.html",
        "css/styles.css",
        "js/app.js",
        "js/map.js",
        "js/charts.js",
        "js/anomaly_engine.js",
        "js/data_loader.js",
        "data/postal_districts.json",
        "data/state_grid.json",
        "data/usps_psra_sample.json",
        "data/usps_psra_sample.csv",
        "serve.py",
        "README.md"
    ]

    for rf in required_files:
        total += 1
        path = os.path.join(BASE_DIR, rf)
        assert os.path.exists(path), f"Missing file: {rf}"
        passed += 1
    print(f"✅ [1/5] All {len(required_files)} core files present.")

    # Test 2: Verify JSON dataset integrity
    total += 1
    with open(os.path.join(BASE_DIR, "data/usps_psra_sample.json")) as f:
        data = json.load(f)
        assert "records" in data
        assert "weeks" in data
        assert "districts" in data
        assert "mail_classes" in data
        assert len(data["records"]) == 3120
        assert len(data["weeks"]) == 12
        assert len(data["districts"]) == 52
        assert len(data["mail_classes"]) == 5
    passed += 1
    print(f"✅ [2/5] Sample JSON dataset verified: 3,120 records across 12 weeks.")

    # Test 3: Verify CSV dataset integrity & schema
    total += 1
    with open(os.path.join(BASE_DIR, "data/usps_psra_sample.csv")) as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        expected_headers = [
            "Fiscal_Year", "Fiscal_Quarter", "Postal_Week_Number", "Week_Start_Date", "Week_End_Date",
            "Area_Name", "District_Name", "State_Code", "State_Name", "Mail_Class",
            "Service_Standard_Target", "On_Time_Percent", "Average_Days_To_Deliver",
            "Total_Volume_Sampled", "Severe_Delay_Percent", "Disruption_Status", "Disruption_Reason"
        ]
        for eh in expected_headers:
            assert eh in headers, f"Missing header {eh} in CSV"
        rows = list(reader)
        assert len(rows) == 3120, f"Expected 3120 rows, got {len(rows)}"
    passed += 1
    print(f"✅ [3/5] Sample CSV dataset verified: matches official PSRA schema.")

    # Test 4: Verify State Grid configuration
    total += 1
    with open(os.path.join(BASE_DIR, "data/state_grid.json")) as f:
        grid = json.load(f)
        assert len(grid) == 52
        for g in grid:
            assert 0 <= g["row"] < 8
            assert 0 <= g["col"] < 12
    passed += 1
    print(f"✅ [4/5] State Cartogram Grid layout verified: 52 jurisdictions.")

    # Test 5: Check HTTP Server handler MIME resolution
    total += 1
    sys.path.insert(0, BASE_DIR)
    from serve import PostalHTTPRequestHandler
    
    class DummyHandler(PostalHTTPRequestHandler):
        def __init__(self):
            pass

    handler = DummyHandler()
    assert handler.guess_type("app.js") == "text/javascript"
    assert handler.guess_type("styles.css") == "text/css"
    assert handler.guess_type("data.json") == "application/json"
    assert handler.guess_type("data.csv") == "text/csv"
    passed += 1
    print(f"✅ [5/5] HTTP server MIME types verified for ES modules and data files.")

    print(f"\n🎉 All {passed}/{total} verification tests passed successfully!")

if __name__ == "__main__":
    run_tests()

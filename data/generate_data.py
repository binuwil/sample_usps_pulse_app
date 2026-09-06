import json
import csv
import random
from datetime import datetime, timedelta

DISTRICT_DEFS = [
    # Atlantic Area
    {"state": "ME", "name": "Maine", "district": "Northern New England", "area": "Atlantic", "lat": 45.2538, "lon": -69.4455, "base_perf": 93.8},
    {"state": "NH", "name": "New Hampshire", "district": "Northern New England", "area": "Atlantic", "lat": 43.1939, "lon": -71.5724, "base_perf": 93.5},
    {"state": "VT", "name": "Vermont", "district": "Northern New England", "area": "Atlantic", "lat": 44.5588, "lon": -72.5778, "base_perf": 94.1},
    {"state": "MA", "name": "Massachusetts", "district": "Boston", "area": "Atlantic", "lat": 42.4072, "lon": -71.3824, "base_perf": 92.4},
    {"state": "RI", "name": "Rhode Island", "district": "Boston", "area": "Atlantic", "lat": 41.5801, "lon": -71.4774, "base_perf": 92.9},
    {"state": "CT", "name": "Connecticut", "district": "Connecticut", "area": "Atlantic", "lat": 41.6032, "lon": -73.0877, "base_perf": 93.1},
    {"state": "NY", "name": "New York", "district": "New York 2 (Metro)", "area": "Atlantic", "lat": 43.2994, "lon": -74.2179, "base_perf": 91.2},
    {"state": "NJ", "name": "New Jersey", "district": "New Jersey", "area": "Atlantic", "lat": 40.0583, "lon": -74.4057, "base_perf": 91.8},
    {"state": "PA", "name": "Pennsylvania", "district": "Philadelphia", "area": "Atlantic", "lat": 41.2033, "lon": -77.1945, "base_perf": 92.6},
    {"state": "DE", "name": "Delaware", "district": "Maryland/Delaware", "area": "Atlantic", "lat": 38.9108, "lon": -75.5277, "base_perf": 93.2},
    {"state": "MD", "name": "Maryland", "district": "Maryland/Delaware", "area": "Atlantic", "lat": 39.0458, "lon": -76.6413, "base_perf": 91.7},
    {"state": "DC", "name": "District of Columbia", "district": "Capital", "area": "Atlantic", "lat": 38.9072, "lon": -77.0369, "base_perf": 90.5},
    {"state": "VA", "name": "Virginia", "district": "Virginia", "area": "Atlantic", "lat": 37.4316, "lon": -78.6569, "base_perf": 92.8},
    {"state": "WV", "name": "West Virginia", "district": "Appalachian", "area": "Atlantic", "lat": 38.5976, "lon": -80.4549, "base_perf": 91.9},
    {"state": "NC", "name": "North Carolina", "district": "North Carolina", "area": "Atlantic", "lat": 35.7596, "lon": -79.0193, "base_perf": 92.5},
    {"state": "SC", "name": "South Carolina", "district": "South Carolina", "area": "Atlantic", "lat": 33.8361, "lon": -81.1637, "base_perf": 92.1},
    {"state": "PR", "name": "Puerto Rico", "district": "Caribbean", "area": "Atlantic", "lat": 18.2208, "lon": -66.5901, "base_perf": 89.2},

    # Central Area
    {"state": "OH", "name": "Ohio", "district": "Ohio 1 (Columbus)", "area": "Central", "lat": 40.4173, "lon": -82.9071, "base_perf": 93.2},
    {"state": "MI", "name": "Michigan", "district": "Michigan 1 (Detroit)", "area": "Central", "lat": 44.3148, "lon": -85.6024, "base_perf": 92.4},
    {"state": "IN", "name": "Indiana", "district": "Indiana", "area": "Central", "lat": 40.2672, "lon": -86.1349, "base_perf": 93.6},
    {"state": "IL", "name": "Illinois", "district": "Illinois 1 (Chicago)", "area": "Central", "lat": 40.6331, "lon": -89.3985, "base_perf": 90.8},
    {"state": "WI", "name": "Wisconsin", "district": "Wisconsin", "area": "Central", "lat": 43.7844, "lon": -88.7879, "base_perf": 93.9},
    {"state": "MN", "name": "Minnesota", "district": "Northland", "area": "Central", "lat": 46.7296, "lon": -94.6859, "base_perf": 93.4},
    {"state": "ND", "name": "North Dakota", "district": "Dakotas", "area": "Central", "lat": 47.5515, "lon": -101.0020, "base_perf": 94.2},
    {"state": "SD", "name": "South Dakota", "district": "Dakotas", "area": "Central", "lat": 43.9695, "lon": -99.9018, "base_perf": 93.9},
    {"state": "IA", "name": "Iowa", "district": "Iowa/Nebraska", "area": "Central", "lat": 41.8780, "lon": -93.0977, "base_perf": 94.5},
    {"state": "NE", "name": "Nebraska", "district": "Iowa/Nebraska", "area": "Central", "lat": 41.4925, "lon": -99.9018, "base_perf": 94.2},
    {"state": "KS", "name": "Kansas", "district": "Kansas/Missouri", "area": "Central", "lat": 39.0119, "lon": -98.4842, "base_perf": 93.7},
    {"state": "MO", "name": "Missouri", "district": "Kansas/Missouri", "area": "Central", "lat": 37.9643, "lon": -91.8318, "base_perf": 92.8},

    # Southern Area
    {"state": "GA", "name": "Georgia", "district": "Georgia (Atlanta)", "area": "Southern", "lat": 32.1656, "lon": -82.9001, "base_perf": 83.5},
    {"state": "FL", "name": "Florida", "district": "Florida 1 (Central)", "area": "Southern", "lat": 27.6648, "lon": -81.5158, "base_perf": 92.7},
    {"state": "AL", "name": "Alabama", "district": "Alabama/Mississippi", "area": "Southern", "lat": 32.3182, "lon": -86.9023, "base_perf": 91.5},
    {"state": "MS", "name": "Mississippi", "district": "Alabama/Mississippi", "area": "Southern", "lat": 32.3547, "lon": -89.3985, "base_perf": 90.9},
    {"state": "TN", "name": "Tennessee", "district": "Tennessee", "area": "Southern", "lat": 35.5175, "lon": -86.5804, "base_perf": 92.8},
    {"state": "KY", "name": "Kentucky", "district": "Kentucky", "area": "Southern", "lat": 37.8393, "lon": -84.2700, "base_perf": 92.4},
    {"state": "AR", "name": "Arkansas", "district": "Arkansas", "area": "Southern", "lat": 35.2010, "lon": -91.8318, "base_perf": 93.1},
    {"state": "LA", "name": "Louisiana", "district": "Louisiana", "area": "Southern", "lat": 30.9843, "lon": -91.9623, "base_perf": 90.8},
    {"state": "OK", "name": "Oklahoma", "district": "Oklahoma", "area": "Southern", "lat": 35.0078, "lon": -97.0929, "base_perf": 93.0},
    {"state": "TX", "name": "Texas", "district": "Texas 2 (Houston/Gulf)", "area": "Southern", "lat": 31.9686, "lon": -99.9018, "base_perf": 86.4},

    # WestPac Area
    {"state": "WA", "name": "Washington", "district": "Washington", "area": "WestPac", "lat": 47.7511, "lon": -120.7401, "base_perf": 93.1},
    {"state": "OR", "name": "Oregon", "district": "Oregon/Idaho", "area": "WestPac", "lat": 43.8041, "lon": -120.5542, "base_perf": 93.6},
    {"state": "CA", "name": "California", "district": "California 1 (Bay Area)", "area": "WestPac", "lat": 36.7783, "lon": -119.4179, "base_perf": 91.9},
    {"state": "NV", "name": "Nevada", "district": "Nevada", "area": "WestPac", "lat": 38.8026, "lon": -116.4194, "base_perf": 93.2},
    {"state": "ID", "name": "Idaho", "district": "Oregon/Idaho", "area": "WestPac", "lat": 44.0682, "lon": -114.7420, "base_perf": 94.0},
    {"state": "MT", "name": "Montana", "district": "Montana/Wyoming", "area": "WestPac", "lat": 46.8797, "lon": -110.3626, "base_perf": 94.5},
    {"state": "WY", "name": "Wyoming", "district": "Montana/Wyoming", "area": "WestPac", "lat": 43.0760, "lon": -107.2903, "base_perf": 94.3},
    {"state": "UT", "name": "Utah", "district": "Utah", "area": "WestPac", "lat": 39.3210, "lon": -111.0937, "base_perf": 94.1},
    {"state": "CO", "name": "Colorado", "district": "Colorado", "area": "WestPac", "lat": 39.5501, "lon": -105.7821, "base_perf": 93.4},
    {"state": "AZ", "name": "Arizona", "district": "Arizona/New Mexico", "area": "WestPac", "lat": 34.0489, "lon": -111.0937, "base_perf": 93.2},
    {"state": "NM", "name": "New Mexico", "district": "Arizona/New Mexico", "area": "WestPac", "lat": 34.5199, "lon": -105.8701, "base_perf": 92.8},
    {"state": "AK", "name": "Alaska", "district": "Alaska", "area": "WestPac", "lat": 64.2008, "lon": -149.4937, "base_perf": 89.8},
    {"state": "HI", "name": "Hawaii", "district": "Hawaii/Pacific", "area": "WestPac", "lat": 19.8968, "lon": -155.5828, "base_perf": 91.1},
]

MAIL_CLASSES = [
    {"id": "fc_2day", "name": "First-Class Mail (2-Day)", "target": 95.0, "base_days": 2.1, "vol_weight": 0.35},
    {"id": "fc_35day", "name": "First-Class Mail (3-5 Day)", "target": 93.0, "base_days": 3.8, "vol_weight": 0.25},
    {"id": "marketing", "name": "USPS Marketing Mail", "target": 95.0, "base_days": 4.4, "vol_weight": 0.25},
    {"id": "ground_pkg", "name": "Package Services / Ground Adv", "target": 92.0, "base_days": 3.2, "vol_weight": 0.10},
    {"id": "periodicals", "name": "Periodicals", "target": 90.0, "base_days": 4.9, "vol_weight": 0.05},
]

START_DATE = datetime(2024, 6, 1)
WEEKS = []
for w in range(12):
    w_start = START_DATE + timedelta(days=w * 7)
    w_end = w_start + timedelta(days=6)
    WEEKS.append({
        "week_number": w + 1,
        "fiscal_year": 2024,
        "fiscal_quarter": "Q4" if w >= 8 else "Q3",
        "start_date": w_start.strftime("%Y-%m-%d"),
        "end_date": w_end.strftime("%Y-%m-%d"),
        "label": f"Week {w+1} ({w_start.strftime('%b %d')})"
    })

def generate_sample_data():
    random.seed(42)
    all_records = []
    
    for wk_idx, wk in enumerate(WEEKS):
        wk_num = wk["week_number"]
        for dist in DISTRICT_DEFS:
            for mc in MAIL_CLASSES:
                base = dist["base_perf"]
                if mc["id"] == "fc_35day":
                    base -= 2.2
                elif mc["id"] == "marketing":
                    base += 0.8
                elif mc["id"] == "periodicals":
                    base -= 3.5
                elif mc["id"] == "ground_pkg":
                    base -= 1.0

                disruption_status = "NORMAL"
                disruption_reason = "Normal Network Operations"
                perf_penalty = 0.0

                # Disruption Scenarios
                if dist["state"] == "GA" and 2 <= wk_num <= 6:
                    perf_penalty = random.uniform(13.0, 19.5)
                    disruption_status = "CRITICAL"
                    disruption_reason = "Palmetto RPDC Consolidation / Sorter Integration Delays"
                elif dist["state"] == "GA" and 7 <= wk_num <= 9:
                    perf_penalty = random.uniform(5.5, 8.5)
                    disruption_status = "WARNING"
                    disruption_reason = "RPDC Sorter Recovery In Progress"
                elif dist["state"] == "TX" and 3 <= wk_num <= 7:
                    perf_penalty = random.uniform(8.0, 13.0)
                    disruption_status = "CRITICAL"
                    disruption_reason = "North Houston Processing & Network Modernization Bottleneck"
                elif dist["state"] in ["IL", "IN", "OH", "MI"] and wk_num == 5:
                    perf_penalty = random.uniform(4.5, 8.0)
                    disruption_status = "WARNING"
                    disruption_reason = "Midwest Convective Storms & Flight Cargo Grounding"
                elif dist["state"] in ["MN", "ND", "SD"] and wk_num == 8:
                    perf_penalty = random.uniform(5.0, 8.5)
                    disruption_status = "WARNING"
                    disruption_reason = "Severe Ground Transportation Weather Delays"
                elif dist["state"] in ["CA", "OR", "WA"] and wk_num == 10:
                    perf_penalty = random.uniform(3.5, 6.0)
                    disruption_status = "WATCH"
                    disruption_reason = "Interstate Highway Closures & Regional Dispatch Reroutes"

                noise = random.uniform(-1.2, 1.2)
                final_perf = round(min(99.2, max(64.0, base - perf_penalty + noise)), 1)
                severe_delay = round(max(0.4, (100.0 - final_perf) * random.uniform(0.18, 0.32)), 1)
                days_delay = (100.0 - final_perf) * 0.05
                avg_days = round(mc["base_days"] + days_delay + random.uniform(-0.12, 0.15), 2)
                
                base_vol = 180000 if dist["state"] in ["CA", "TX", "NY", "FL"] else 45000
                sampled_vol = int(base_vol * mc["vol_weight"] * random.uniform(0.92, 1.08))

                record = {
                    "Fiscal_Year": wk["fiscal_year"],
                    "Fiscal_Quarter": wk["fiscal_quarter"],
                    "Postal_Week_Number": wk_num,
                    "Week_Label": wk["label"],
                    "Week_Start_Date": wk["start_date"],
                    "Week_End_Date": wk["end_date"],
                    "Area_Name": dist["area"],
                    "District_Name": dist["district"],
                    "State_Code": dist["state"],
                    "State_Name": dist["name"],
                    "Latitude": dist["lat"],
                    "Longitude": dist["lon"],
                    "Mail_Class": mc["name"],
                    "Mail_Class_Id": mc["id"],
                    "Service_Standard_Target": mc["target"],
                    "On_Time_Percent": final_perf,
                    "Average_Days_To_Deliver": avg_days,
                    "Total_Volume_Sampled": sampled_vol,
                    "Severe_Delay_Percent": severe_delay,
                    "Disruption_Status": disruption_status,
                    "Disruption_Reason": disruption_reason
                }
                all_records.append(record)

    return all_records

if __name__ == "__main__":
    records = generate_sample_data()
    print(f"Generated {len(records)} sample performance records.")

    with open("/Users/benz/.gemini/antigravity/scratch/usps-pulse/data/postal_districts.json", "w") as f:
        json.dump(DISTRICT_DEFS, f, indent=2)

    with open("/Users/benz/.gemini/antigravity/scratch/usps-pulse/data/usps_psra_sample.json", "w") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "source": "USPS Postal Service Reform Act (PSRA) Weekly Service Performance Benchmark",
            "weeks": WEEKS,
            "districts": DISTRICT_DEFS,
            "mail_classes": MAIL_CLASSES,
            "records": records
        }, f, indent=2)

    csv_fields = [
        "Fiscal_Year", "Fiscal_Quarter", "Postal_Week_Number", "Week_Start_Date", "Week_End_Date",
        "Area_Name", "District_Name", "State_Code", "State_Name", "Mail_Class",
        "Service_Standard_Target", "On_Time_Percent", "Average_Days_To_Deliver",
        "Total_Volume_Sampled", "Severe_Delay_Percent", "Disruption_Status", "Disruption_Reason"
    ]
    with open("/Users/benz/.gemini/antigravity/scratch/usps-pulse/data/usps_psra_sample.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

    print("Successfully written postal_districts.json, usps_psra_sample.json, and usps_psra_sample.csv.")

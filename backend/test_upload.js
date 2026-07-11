const fs = require('fs');

async function testUpload() {
  console.log("Starting test upload of test.csv...");
  try {
    const fileBuffer = fs.readFileSync('../test.csv');
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'test.csv');

    const response = await fetch("http://localhost:5000/api/import", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    console.log("Response from server:", JSON.stringify(data, null, 2));

    if (data.success) {
      console.log("✅ API successfully processed the CSV!");
    } else {
      console.error("❌ API returned an error.");
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

testUpload();

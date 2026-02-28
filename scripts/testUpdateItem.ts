import fetch from "node-fetch";

async function testUpdate() {
  const token = ""; // Need a valid token
  const res = await fetch(
    "http://localhost:3000/api/v2/shopping-list-items/7f099e43-658d-46c4-975c-b0cb4317d447",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: "tttttt",
        quantity: 1.0,
        unit: "個",
      }),
    },
  );

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testUpdate();


import { featuresApi } from './src/api/features';
import { vehiclesApi } from './src/api/vehicles';

async function test() {
  try {
    console.log("Testing featuresApi.getVariantsWithPrice...");
    const res = await featuresApi.getVariantsWithPrice({ q: "SUV" });
    console.log("Response:", JSON.stringify(res, null, 2));
    
    console.log("\nTesting vehiclesApi.getAll...");
    const vRes = await vehiclesApi.getAll();
    console.log("Vehicles:", vRes.data?.length || 0);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();

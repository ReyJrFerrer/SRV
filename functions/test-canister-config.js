const {
  detectEnvironment,
  validateCanisterConnection,
  getCommissionFromCanister,
} = require("./utils/canisterConfig");

async function testCanisterConfig() {
  console.log("🧪 Testing Canister Configuration...");

  // Test environment detection
  const env = detectEnvironment();
  console.log("Environment detected:", env);

  // Test canister connection
  const connection = await validateCanisterConnection();
  console.log("Connection test:", connection);

  // Test commission calculation
  const commission = await getCommissionFromCanister("Cleaning Services", 1000);
  console.log("Commission test:", commission);
}

testCanisterConfig().catch(console.error);

import assert from "assert";
import { 
  TestHelpers,
  Kintsu_Transfer
} from "generated";
const { MockDb, Kintsu } = TestHelpers;

describe("Kintsu contract Transfer event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Kintsu contract Transfer event
  const event = Kintsu.Transfer.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Kintsu_Transfer is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Kintsu.Transfer.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualKintsuTransfer = mockDbUpdated.entities.Kintsu_Transfer.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedKintsuTransfer: Kintsu_Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      value: event.params.value,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualKintsuTransfer, expectedKintsuTransfer, "Actual KintsuTransfer should be the same as the expectedKintsuTransfer");
  });
});

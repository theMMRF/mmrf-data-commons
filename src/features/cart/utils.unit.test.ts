import { CartItem, UserProfile } from "@gen3/core";
import { groupByAccess } from "./utils";

describe("groupByAccess", () => {
  it("user can access open access files", () => {
    const result = groupByAccess(
      [{ id: "1", access: "open", file_id: "1" }] as CartItem[],
      {
        username: "",
        projects: { phs_ids: {}, gdc_ids: {} },
      } as unknown as UserProfile,
    );
    expect(result).toEqual({
      true: [{ id: "1", access: "open", file_id: "1", canAccess: true }],
    });
  });

  it("a user that isn't logged in can't access controlled files", () => {
    const result = groupByAccess(
      [{ id: "1", access: "controlled", file_id: "1" }] as CartItem[],
      {
        username: "",
        projects: { phs_ids: {}, gdc_ids: {} },
      } as unknown as UserProfile,
    );
    expect(result).toEqual({
      false: [
        { id: "1", access: "controlled", file_id: "1", canAccess: false },
      ],
    });
  });

  it("a logged in user can access files in projects they have access to", () => {
    const result = groupByAccess(
      [
        { id: "1", access: "controlled", file_id: "1", project_id: "CAT" },
        { id: "2", access: "controlled", file_id: "2", project_id: "DOG" },
      ] as CartItem[],
      {
        username: "user",
        projects: {
          phs_ids: {},
          gdc_ids: { CAT: ["_member_"] },
        },
      } as unknown as UserProfile,
    );

    expect(result).toEqual({
      true: [
        {
          access: "controlled",
          id: "1",
          file_id: "1",
          canAccess: true,
          project_id: "CAT",
        },
      ],
      false: [
        {
          access: "controlled",
          id: "2",
          file_id: "2",
          canAccess: false,
          project_id: "DOG",
        },
      ],
    });
  });
});

import {
  planContentContributorAdd,
  userCanEditDocumentContent,
} from "./document-content-access";

describe("userCanEditDocumentContent", () => {
  const ownerId = "owner-1";
  const contributorId = "contributor-1";

  it("allows the document owner", () => {
    expect(
      userCanEditDocumentContent(ownerId, {
        createdBy: { id: ownerId },
      }),
    ).toBe(true);
  });

  it("allows a content contributor stored as a user", () => {
    expect(
      userCanEditDocumentContent(contributorId, {
        createdBy: { id: ownerId },
        contentContributors: [{ id: contributorId }],
      }),
    ).toBe(true);
  });

  it("allows a content contributor stored as a join row", () => {
    expect(
      userCanEditDocumentContent(contributorId, {
        createdBy: { id: ownerId },
        contentContributors: [{ id: 4, user: { id: contributorId } }],
      }),
    ).toBe(true);
  });

  it("does not treat a join-row id as a user id", () => {
    expect(
      userCanEditDocumentContent("4", {
        contentContributors: [{ id: 4, user: { id: contributorId } }],
      }),
    ).toBe(false);
  });

  it("denies everyone else", () => {
    expect(
      userCanEditDocumentContent("someone-else", {
        createdBy: { id: ownerId },
        contentContributors: [{ id: contributorId }],
      }),
    ).toBe(false);
    expect(userCanEditDocumentContent(ownerId, null)).toBe(false);
    expect(userCanEditDocumentContent("", { createdBy: { id: ownerId } })).toBe(
      false,
    );
  });
});

describe("planContentContributorAdd", () => {
  it("adds eligible people who are not already contributors", () => {
    expect(
      planContentContributorAdd({
        ownerId: "owner",
        existingIds: ["already"],
        requestedIds: ["already", "new-user", "new-user"],
        eligibleIds: ["already", "new-user", "owner"],
      }),
    ).toEqual({ ok: true, userIds: ["new-user"] });
  });

  it("rejects the document owner", () => {
    expect(
      planContentContributorAdd({
        ownerId: "owner",
        existingIds: [],
        requestedIds: ["owner", "new-user"],
        eligibleIds: ["owner", "new-user"],
      }),
    ).toEqual({ ok: false, reason: "includes_owner" });
  });

  it("rejects people who cannot update documents on the team", () => {
    expect(
      planContentContributorAdd({
        ownerId: "owner",
        existingIds: [],
        requestedIds: ["outsider"],
        eligibleIds: ["teammate"],
      }),
    ).toEqual({ ok: false, reason: "ineligible" });
  });
});

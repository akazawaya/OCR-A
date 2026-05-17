// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";

describe("DocumentsPage deleteButton", () => {
  test("削除ボタンを押すと該当DocumentがDocumentTableから消える", async () => {
    renderDocumentsPage();

    const targetCell = await screen.findByRole("cell", {
      name: "beta-report.pdf",
    });
    const targetRow = targetCell.closest("tr");
    expect(targetRow).not.toBeNull();

    const user = userEvent.setup();
    await user.click(within(targetRow).getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: "beta-report.pdf" }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("cell", { name: "alpha-report.pdf" }),
    ).toBeVisible();
    expect(screen.getByRole("cell", { name: "gamma-alpha.pdf" })).toBeVisible();
  });
});

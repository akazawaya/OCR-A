// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";

describe("DocumentsPage query", () => {
  test("searchQuery:検索条件の絞り込みにより該当データのみDocumentsTableに残る", async () => {
    renderDocumentsPage();

    const keywordInput = screen.getByRole("textbox");
    const user = userEvent.setup();
    await user.type(keywordInput, "beta");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(
      await screen.findByRole("cell", { name: "beta-report.pdf" }),
    ).toBeVisible();
    expect(screen.queryByRole("cell", { name: "alpha-report.pdf" })).toBeNull();
    expect(screen.queryByRole("cell", { name: "gamma-alpha.pdf" })).toBeNull();
  });

  test("searchQuery:検索後にリセットすると入力値が初期値に戻る", async () => {
    renderDocumentsPage();

    const user = userEvent.setup();
    const keywordInput = screen.getByRole("textbox");

    await user.type(keywordInput, "beta");
    await user.click(screen.getByLabelText("ファイル名"));
    await user.click(screen.getByLabelText("完全一致"));
    await user.click(screen.getByLabelText("AND"));
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(screen.getByDisplayValue("beta")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByLabelText("両方")).toBeChecked();
    expect(screen.getByLabelText("部分一致")).toBeChecked();
    expect(screen.getByLabelText("OR")).toBeChecked();
  });

  test("sortQuery:並び替えがDocumentsTableで機能する", async () => {
    renderDocumentsPage();

    expect(
      await screen.findByRole("cell", { name: "alpha-report.pdf" }),
    ).toBeVisible();

    const user = userEvent.setup();
    await user.click(screen.getByRole("columnheader", { name: /^名前/ }));

    const rows = screen.getAllByRole("row").slice(1);
    const orderedFileNames = rows.map(
      (row) => within(row).getAllByRole("cell")[1].textContent,
    );
    expect(orderedFileNames).toEqual([
      "alpha-report.pdf",
      "beta-report.pdf",
      "gamma-alpha.pdf",
    ]);

    await user.click(screen.getByRole("columnheader", { name: /^名前/ }));

    const rowsAfterDesc = screen.getAllByRole("row").slice(1);
    const descOrderedFileNames = rowsAfterDesc.map(
      (row) => within(row).getAllByRole("cell")[1].textContent,
    );
    expect(descOrderedFileNames).toEqual([
      "gamma-alpha.pdf",
      "beta-report.pdf",
      "alpha-report.pdf",
    ]);
  });

  test("sortQuery:同じ列をクリックすると昇順→降順→解除となる", async () => {
    renderDocumentsPage({
      initialEntry: "/documents?ordering=created",
    });

    expect(
      await screen.findByRole("cell", { name: "alpha-report.pdf" }),
    ).toBeVisible();

    const user = userEvent.setup();
    await user.click(screen.getByRole("columnheader", { name: /^名前/ }));

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/documents?ordering=file_name",
    );

    await user.click(screen.getByRole("columnheader", { name: /^名前/ }));
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/documents?ordering=-file_name",
    );

    await user.click(screen.getByRole("columnheader", { name: /^名前/ }));
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/documents",
    );
  });

  test("routingQuery:行クリックでviewerへページ遷移する", async () => {
    renderDocumentsPage();

    const targetCell = await screen.findByRole("cell", {
      name: "beta-report.pdf",
    });
    const user = userEvent.setup();
    await user.click(targetCell);

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/documents/2/viewer",
    );
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  it("renders starter title", () => {
    render(<App />);
    expect(screen.getByText("災害資訊整理工作台")).toBeInTheDocument();
  });

  it("keeps the home page focused on phase 0 tabs", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: "原始資訊" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "整理工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通報" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "地點" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "志工任務" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "人員指派" }),
    ).not.toBeInTheDocument();
  });

  it("shows review states in the phase 0 workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(
      screen.getByText(
        "第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("待人工確認").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
  });

  it("shows uncertainty notes for the selected raw record", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(screen.getByText("不合理或不確定的部分")).toBeInTheDocument();
    expect(
      screen.getByText("來源可能不是現場第一手確認，需要補問來源與情境。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("地點描述不夠精確，不能直接派人或公告集合位置。"),
    ).toBeInTheDocument();
  });

  it("lets learners create and edit a phase 0 judgement draft", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(screen.getAllByText("尚未整理").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "新增這筆草稿" }));

    expect(screen.getByText("新增及編輯草稿")).toBeInTheDocument();
    expect(screen.getByText("已有草稿")).toBeInTheDocument();
    expect(
      screen.getByText("目前已建立 1 筆可編輯整理草稿"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("可能類型"), {
      target: { value: "task_candidate" },
    });
    fireEvent.change(screen.getByLabelText("人工確認備註"), {
      target: { value: "需要先確認地點與當事人同意。" },
    });

    expect(screen.getAllByText("任務候選").length).toBeGreaterThan(0);
    expect(
      screen.getByDisplayValue("需要先確認地點與當事人同意。"),
    ).toBeInTheDocument();
  });

  it("can automatically prefill draft fields for human correction", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));
    fireEvent.click(screen.getByRole("button", { name: "自動建立草稿" }));

    expect(screen.getByText("已有草稿")).toBeInTheDocument();
    expect(
      screen.getByText("已自動預填可能類型、信心程度與下一步，請人工修正。"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("可能類型")).toHaveValue(
      "help_request_candidate",
    );
    expect(screen.getByLabelText("信心程度")).toHaveValue("low");
    expect(screen.getByLabelText("下一步")).toHaveValue("send_to_human_review");

    fireEvent.change(screen.getByLabelText("可能類型"), {
      target: { value: "unknown" },
    });
    expect(screen.getByLabelText("可能類型")).toHaveValue("unknown");
  });

  it("lets learners fill blockers line by line with presets or custom text", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));
    fireEvent.click(screen.getByRole("button", { name: "新增這筆草稿" }));

    fireEvent.change(screen.getByLabelText("第 1 筆卡住原因選項"), {
      target: { value: "地點描述不夠精確，不能直接派人或公告集合位置。" },
    });
    expect(
      screen.getByDisplayValue(
        "地點描述不夠精確，不能直接派人或公告集合位置。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增一筆卡住原因" }));
    fireEvent.change(screen.getByLabelText("第 2 筆卡住原因選項"), {
      target: {
        value: "原文已明確提供可辨識且足以人工確認的地點描述。",
      },
    });
    expect(
      screen.getByDisplayValue(
        "原文已明確提供可辨識且足以人工確認的地點描述。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增一筆卡住原因" }));
    fireEvent.change(screen.getByLabelText("第 3 筆卡住原因選項"), {
      target: { value: "__custom__" },
    });
    fireEvent.change(screen.getByLabelText("第 3 筆卡住原因內容"), {
      target: { value: "原文只提到老雜貨店後面，沒有完整位置。" },
    });
    expect(
      screen.getByDisplayValue("原文只提到老雜貨店後面，沒有完整位置。"),
    ).toBeInTheDocument();
  });

  it("places the draft editor before the starter safety summary", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    const draftTitle = screen.getByText("新增及編輯草稿");
    const starterTitle = screen.getByText("尚未建立整理草稿");

    expect(
      draftTitle.compareDocumentPosition(starterTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lets learners save, reset, and delete drafts", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));
    fireEvent.click(screen.getByRole("button", { name: "新增這筆草稿" }));

    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
    expect(
      screen.getByText("已保存於本頁面暫存，重新整理後不會保留。"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("可能類型"), {
      target: { value: "task_candidate" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重設草稿" }));
    expect(screen.getByText("已重設為 Starter 安全預設。")).toBeInTheDocument();
    expect(screen.getByLabelText("可能類型")).toHaveValue("unknown");

    fireEvent.click(screen.getByRole("button", { name: "刪除草稿" }));
    expect(
      screen.getByRole("button", { name: "新增這筆草稿" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("已有草稿")).not.toBeInTheDocument();
  });
});

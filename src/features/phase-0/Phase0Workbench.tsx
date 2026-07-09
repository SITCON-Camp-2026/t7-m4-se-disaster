import { useState } from "react";
import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import { createPhase0Judgement } from "./phase0-heuristics";
import type {
  Phase0Confidence,
  Phase0JudgementDraft,
  Phase0MessyRecord,
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "./phase0-types";

const possibleKindOptions: Array<{ value: Phase0PossibleKind; label: string }> =
  [
    { value: "unknown", label: "候選類型待判斷" },
    { value: "help_request_candidate", label: "求助候選" },
    { value: "site_status_candidate", label: "地點狀態候選" },
    { value: "task_candidate", label: "任務候選" },
    { value: "assignment_candidate", label: "人員指派候選" },
    { value: "announcement_candidate", label: "公告候選" },
  ];

const confidenceOptions: Array<{ value: Phase0Confidence; label: string }> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const nextStepOptions: Array<{
  value: Phase0SuggestedNextStep;
  label: string;
}> = [
  { value: "send_to_human_review", label: "交給人工確認" },
  { value: "ask_for_more_info", label: "補問來源或現場資訊" },
  { value: "do_not_use_yet", label: "暫時不要使用" },
  { value: "keep_raw", label: "先保留原始資訊" },
  { value: "create_candidate_report", label: "建立候選通報" },
  { value: "create_site_update_suggestion", label: "建立地點更新建議" },
];

const customBlockerValue = "__custom__";

const confirmationBlockerByUncertainty: Record<string, string> = {
  "查核狀態不是已確認，不能直接當成事實或任務。":
    "原文已明確說明資訊被確認，但仍需檢查是否可轉成任務。",
  "來源可能不是現場第一手確認，需要補問來源與情境。":
    "原文已明確說明來源是現場第一手確認。",
  "原文包含轉述或留言資訊，說法來源需要人工確認。":
    "原文已明確說明資訊不是轉述或留言，而是直接回報。",
  "原文已出現不確定語氣，不能把推測寫成已確認。":
    "原文已明確排除不確定語氣，資訊內容清楚可被檢查。",
  "時間線可能不完整或已過期，需要確認現在是否仍有效。":
    "原文已明確提供目前有效時間或最新更新時間。",
  "地點描述不夠精確，不能直接派人或公告集合位置。":
    "原文已明確提供可辨識且足以人工確認的地點描述。",
  "內容可能涉及安全或交通風險，應先交給人工確認。":
    "原文已明確說明安全或交通狀態已由合適角色確認。",
  "內容可能涉及個人、健康或隱私資訊，不適合直接公開或派工。":
    "原文已明確說明個人、健康或隱私相關資訊已取得必要同意。",
  "目前沒有明顯關鍵字風險，但仍需由人檢查原文與脈絡。":
    "原文沒有明顯不確定語氣，但仍只作為人工檢查依據。",
};

function textToLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function findUncertaintyNotes(record: Phase0MessyRecord) {
  const notes: string[] = [];
  const rawText = record.rawText;

  if (record.verificationStatus !== "verified") {
    notes.push("查核狀態不是已確認，不能直接當成事實或任務。");
  }

  if (["social_post", "phone_call"].includes(record.sourceType)) {
    notes.push("來源可能不是現場第一手確認，需要補問來源與情境。");
  }

  if (includesAny(rawText, ["有人說", "群組說", "社群貼文", "留言有人說"])) {
    notes.push("原文包含轉述或留言資訊，說法來源需要人工確認。");
  }

  if (includesAny(rawText, ["不知道", "疑似", "不確定", "尚未確認"])) {
    notes.push("原文已出現不確定語氣，不能把推測寫成已確認。");
  }

  if (includesAny(rawText, ["昨天", "早上", "中午前", "下午", "剛剛"])) {
    notes.push("時間線可能不完整或已過期，需要確認現在是否仍有效。");
  }

  if (includesAny(rawText, ["附近", "後面", "那邊", "A 區", "第二排住家"])) {
    notes.push("地點描述不夠精確，不能直接派人或公告集合位置。");
  }

  if (includesAny(rawText, ["不適合停留", "道路封閉", "不要再派人"])) {
    notes.push("內容可能涉及安全或交通風險，應先交給人工確認。");
  }

  if (includesAny(rawText, ["藥品", "長者", "同意公開", "完整地址", "親友"])) {
    notes.push("內容可能涉及個人、健康或隱私資訊，不適合直接公開或派工。");
  }

  if (notes.length === 0) {
    notes.push("目前沒有明顯關鍵字風險，但仍需由人檢查原文與脈絡。");
  }

  return notes;
}

function buildBlockerOptions(uncertaintyNotes: string[]) {
  const options = uncertaintyNotes.flatMap((note) => [
    {
      value: note,
      label: `卡住原因：${note}`,
    },
    {
      value:
        confirmationBlockerByUncertainty[note] ?? `原文已明確確認：${note}`,
      label: `反向確認：${
        confirmationBlockerByUncertainty[note] ?? `原文已明確確認：${note}`
      }`,
    },
  ]);

  return [
    ...options,
    {
      value: customBlockerValue,
      label: "其他：自由填寫",
    },
  ];
}

function inferPossibleKind(record: Phase0MessyRecord): Phase0PossibleKind {
  const rawText = record.rawText;

  if (includesAny(rawText, ["道路封閉", "公告", "中午前"])) {
    return "announcement_candidate";
  }

  if (
    includesAny(rawText, [
      "活動中心",
      "集合點",
      "開放",
      "不再收",
      "不缺",
      "還有",
      "剩",
    ])
  ) {
    return "site_status_candidate";
  }

  if (includesAny(rawText, ["派人", "志工", "工班", "支援"])) {
    return "task_candidate";
  }

  if (includesAny(rawText, ["需要", "協助", "藥品", "清泥", "清淤", "搬動"])) {
    return "help_request_candidate";
  }

  return "unknown";
}

function inferConfidence(
  record: Phase0MessyRecord,
  uncertaintyNotes: string[],
): Phase0Confidence {
  if (record.verificationStatus === "unverified") return "low";
  if (uncertaintyNotes.length >= 3) return "low";
  return "medium";
}

function inferSuggestedNextStep(
  record: Phase0MessyRecord,
): Phase0SuggestedNextStep {
  if (
    includesAny(record.rawText, [
      "藥品",
      "長者",
      "完整地址",
      "同意公開",
      "道路封閉",
      "不適合停留",
      "不要再派人",
    ])
  ) {
    return "do_not_use_yet";
  }

  if (record.verificationStatus !== "verified") {
    return "send_to_human_review";
  }

  return "ask_for_more_info";
}

function createAutoSuggestedDraft(
  record: Phase0MessyRecord,
  uncertaintyNotes: string[],
  baseDraft: Phase0JudgementDraft,
): Phase0JudgementDraft {
  return {
    ...baseDraft,
    possibleKind: inferPossibleKind(record),
    confidence: inferConfidence(record, uncertaintyNotes),
    suggestedNextStep: inferSuggestedNextStep(record),
    unsafeToActDirectly: true,
  };
}

export function Phase0Workbench({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  const [draftsByRecordId, setDraftsByRecordId] = useState<
    Record<string, Phase0JudgementDraft>
  >({});
  const [draftMessagesByRecordId, setDraftMessagesByRecordId] = useState<
    Record<string, string>
  >({});
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const safetyBoundary = createPhase0Judgement(selectedRecord);
  const selectedDraft = draftsByRecordId[selectedRecord.id];
  const visibleJudgement = selectedDraft ?? safetyBoundary;
  const uncertaintyNotes = findUncertaintyNotes(selectedRecord);
  const blockerOptions = buildBlockerOptions(uncertaintyNotes);
  const draftCount = Object.keys(draftsByRecordId).length;

  function createDraft() {
    setDraftsByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: current[selectedRecord.id] ?? safetyBoundary,
    }));
  }

  function updateDraft(nextDraft: Phase0JudgementDraft) {
    setDraftsByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: nextDraft,
    }));
  }

  function saveDraft() {
    setDraftMessagesByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: "已保存於本頁面暫存，重新整理後不會保留。",
    }));
  }

  function applyAutoSuggestion() {
    const baseDraft = selectedDraft ?? safetyBoundary;
    setDraftsByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: createAutoSuggestedDraft(
        selectedRecord,
        uncertaintyNotes,
        baseDraft,
      ),
    }));
    setDraftMessagesByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: "已自動預填可能類型、信心程度與下一步，請人工修正。",
    }));
  }

  function resetDraft() {
    setDraftsByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: safetyBoundary,
    }));
    setDraftMessagesByRecordId((current) => ({
      ...current,
      [selectedRecord.id]: "已重設為 Starter 安全預設。",
    }));
  }

  function deleteDraft() {
    setDraftsByRecordId((current) => {
      const next = { ...current };
      delete next[selectedRecord.id];
      return next;
    });
    setDraftMessagesByRecordId((current) => {
      const next = { ...current };
      delete next[selectedRecord.id];
      return next;
    });
  }

  function updateBlockerLine(index: number, value: string) {
    if (!selectedDraft) return;
    const nextBlockers = [...selectedDraft.blockers];
    nextBlockers[index] = value;
    updateDraft({
      ...selectedDraft,
      blockers: nextBlockers,
    });
  }

  function addBlockerLine() {
    if (!selectedDraft) return;
    updateDraft({
      ...selectedDraft,
      blockers: [...selectedDraft.blockers, ""],
    });
  }

  function removeBlockerLine(index: number) {
    if (!selectedDraft) return;
    const nextBlockers = selectedDraft.blockers.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    updateDraft({
      ...selectedDraft,
      blockers: nextBlockers.length > 0 ? nextBlockers : [""],
    });
  }

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <p className="eyebrow">整理工作台</p>
        <h2>第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。</h2>
        <p>
          這裡先只標示安全邊界，真正的候選判斷要由小組和 coding agent
          補上；這不是 runtime LLM 分析，也不是正式資料模型。
        </p>
      </div>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          {records.map((record) => (
            <button
              className={record.id === selectedRecord.id ? "active" : ""}
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
            >
              <span>{record.id}</span>
              <StatusBadge status={record.verificationStatus} />
              <span
                className={
                  draftsByRecordId[record.id]
                    ? "draft-state draft-state--ready"
                    : "draft-state"
                }
              >
                {draftsByRecordId[record.id] ? "已有草稿" : "尚未整理"}
              </span>
            </button>
          ))}
        </aside>

        <div className="workbench__main">
          <RecordCard record={selectedRecord} />

          <section
            className="uncertainty-panel"
            aria-labelledby="uncertainty-title"
          >
            <div className="uncertainty-panel__header">
              <div>
                <p className="eyebrow">保守提醒</p>
                <h3 id="uncertainty-title">不合理或不確定的部分</h3>
              </div>
              <span>仍需人工確認</span>
            </div>
            <p>這裡只根據原文關鍵字與查核狀態提示風險，不代表已完成判斷。</p>
            <ul>
              {uncertaintyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section
            className="draft-editor"
            aria-labelledby="draft-editor-title"
          >
            <div className="draft-editor__header">
              <div>
                <p className="eyebrow">整理草稿</p>
                <h3 id="draft-editor-title">新增及編輯草稿</h3>
              </div>
              <span>{draftCount} 筆草稿</span>
            </div>

            {selectedDraft ? (
              <form
                className="draft-editor__form"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="draft-editor__actions">
                  <button type="button" onClick={saveDraft}>
                    保存草稿
                  </button>
                  <button type="button" onClick={applyAutoSuggestion}>
                    自動預填草稿
                  </button>
                  <button type="button" onClick={resetDraft}>
                    重設草稿
                  </button>
                  <button
                    className="draft-editor__danger"
                    type="button"
                    onClick={deleteDraft}
                  >
                    刪除草稿
                  </button>
                </div>

                {draftMessagesByRecordId[selectedRecord.id] ? (
                  <p className="draft-editor__message">
                    {draftMessagesByRecordId[selectedRecord.id]}
                  </p>
                ) : null}

                <label>
                  可能類型
                  <select
                    value={selectedDraft.possibleKind}
                    onChange={(event) =>
                      updateDraft({
                        ...selectedDraft,
                        possibleKind: event.target.value as Phase0PossibleKind,
                      })
                    }
                  >
                    {possibleKindOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  信心程度
                  <select
                    value={selectedDraft.confidence}
                    onChange={(event) =>
                      updateDraft({
                        ...selectedDraft,
                        confidence: event.target.value as Phase0Confidence,
                      })
                    }
                  >
                    {confidenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  下一步
                  <select
                    value={selectedDraft.suggestedNextStep}
                    onChange={(event) =>
                      updateDraft({
                        ...selectedDraft,
                        suggestedNextStep: event.target
                          .value as Phase0SuggestedNextStep,
                      })
                    }
                  >
                    {nextStepOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="draft-editor__checkbox">
                  <input
                    checked={selectedDraft.unsafeToActDirectly}
                    type="checkbox"
                    onChange={(event) =>
                      updateDraft({
                        ...selectedDraft,
                        unsafeToActDirectly: event.target.checked,
                      })
                    }
                  />
                  不能直接變成志工行動
                </label>

                <fieldset className="draft-editor__wide reason-editor">
                  <legend>卡住原因（一行一點）</legend>
                  <p>
                    可從下拉選單套用不確定原因或反向確認原因；選「其他」可自由填寫。
                  </p>
                  {selectedDraft.blockers.map((item, index) => {
                    const selectedOption = blockerOptions.some(
                      (option) => option.value === item,
                    )
                      ? item
                      : customBlockerValue;

                    return (
                      <div className="reason-editor__row" key={index}>
                        <select
                          aria-label={`第 ${index + 1} 筆卡住原因選項`}
                          value={selectedOption}
                          onChange={(event) => {
                            if (event.target.value === customBlockerValue) {
                              updateBlockerLine(index, "");
                              return;
                            }
                            updateBlockerLine(index, event.target.value);
                          }}
                        >
                          {blockerOptions.map((option) => (
                            <option key={option.label} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label={`第 ${index + 1} 筆卡住原因內容`}
                          placeholder="填寫目前不能直接使用的原因"
                          type="text"
                          value={item}
                          onChange={(event) =>
                            updateBlockerLine(index, event.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeBlockerLine(index)}
                        >
                          移除
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={addBlockerLine}>
                    新增一筆卡住原因
                  </button>
                </fieldset>

                <label className="draft-editor__wide">
                  原文依據（一行一點）
                  <textarea
                    rows={4}
                    value={selectedDraft.evidence.join("\n")}
                    onChange={(event) =>
                      updateDraft({
                        ...selectedDraft,
                        evidence: textToLines(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="draft-editor__wide">
                  人工確認備註
                  <textarea
                    rows={3}
                    value={selectedDraft.humanReviewNote ?? ""}
                    onChange={(event) =>
                      updateDraft({
                        ...selectedDraft,
                        humanReviewNote: event.target.value,
                      })
                    }
                  />
                </label>
              </form>
            ) : (
              <div className="draft-editor__empty">
                <p>
                  這筆原始資訊還沒有整理草稿。建立後請只填原文能支持的內容，
                  不要把推測寫成已確認事實。
                </p>
                <button type="button" onClick={createDraft}>
                  新增這筆草稿
                </button>
                <button type="button" onClick={applyAutoSuggestion}>
                  自動建立草稿
                </button>
              </div>
            )}
          </section>

          <Phase0JudgementCard
            judgement={visibleJudgement}
            record={selectedRecord}
          />
        </div>

        <aside className="workbench__checklist">
          <h3>第一階段完成檢查</h3>
          <ul>
            <li>Starter 已載入 {records.length} 筆原始資訊</li>
            <li>目前已建立 {draftCount} 筆可編輯整理草稿</li>
            <li>至少讓 6 筆原始資訊被嘗試整理成可編輯草稿</li>
            <li>至少挑 2 個候選判斷由人類質疑或修正</li>
            <li>
              把資料品質問題寫進 observations，並記錄 agent 哪裡不能直接相信
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

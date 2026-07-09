# AI Log

這份紀錄用來留下小組如何使用 AI / Coding Agent 的操作脈絡。重點不是逐字保存所有對話，而是記錄重要協作、取捨與人類判斷。

## 什麼時候要記錄

請在以下情況更新本檔案：

- AI 協助分析原始資訊。
- AI 協助找出不能判斷處。
- AI 協助判斷哪些資訊不能直接相信。
- AI 協助判斷哪些資訊不能直接變成任務。
- AI 協助修改畫面標示或前端工作台。
- AI 可能補了原文沒有的資訊。
- AI 建議被小組拒絕，且拒絕原因和安全 / 正確性 / scope 有關
- AI 輸出可能造成誤導，例如把未確認資料寫成已確認事實

## 不需要記錄

- 不需要逐字貼完整對話
- 不需要記錄每一次小型 autocomplete
- 不需要記錄單純修 typo 或格式化

## 紀錄格式

| 時間       | 階段       | 任務                             | AI / Agent 建議                                                                                                               | 採用 / 拒絕 | 人類判斷理由                                                                                 | 相關檔案 / commit                                                                                                   |
| ---------- | ---------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-07-09 | Phase 0    | 在工作台新增草稿新增與編輯區塊   | 建議用 `Phase0JudgementDraft` 做前端記憶體草稿，讓使用者編輯候選類型、信心、依據、卡住原因、下一步與人工確認備註              | 採用        | 草稿不寫回原始資料、不使用 localStorage、不標成已確認，符合第一階段只暴露不確定性的目標      | `src/features/phase-0/Phase0Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                     |
| 2026-07-09 | Phase 0    | 標示資料不合理或不確定處         | 建議用前端保守關鍵字規則提示來源、時間、地點、安全與隱私風險，不呼叫真實 AI API                                               | 採用        | 這些提示只能協助人工檢查，不能自動變成已確認判斷或志工任務                                   | `src/features/phase-0/Phase0Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                     |
| 2026-07-09 | Phase 0    | 標記資料是否已生成草稿           | 建議在工作台左側列表加上「尚未整理 / 已有草稿」標籤，依前端草稿狀態即時更新                                                   | 採用        | 這只是整理進度標記，不代表原始資訊已查核或草稿已可採用                                       | `src/features/phase-0/Phase0Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                     |
| 2026-07-09 | Phase 0    | 增加草稿保存、重設與刪除         | 建議用本頁面暫存保存草稿，並提供重設與刪除操作                                                                                | 採用        | 不使用 localStorage、不修改原始 JSON；草稿只是整理起點，仍需人工檢查                         | `src/features/phase-0/Phase0Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                     |
| 2026-07-09 | Phase 0    | 將卡住原因改為逐列輸入與下拉預設 | 建議每列卡住原因提供不確定提醒、反向確認提醒與其他自由填寫選項                                                                | 採用        | 下拉只是整理輔助；反向確認選項不會自動改變查核狀態，仍需人類確認                             | `src/features/phase-0/Phase0Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                     |
| 2026-07-09 | Phase 0    | 新增草稿自動預填按鈕             | 建議用前端關鍵字規則預填可能類型、信心程度與下一步                                                                            | 採用        | 自動預填只是起點，不呼叫真實 AI API，也不代表資訊已確認；使用者仍需人工修正                  | `src/features/phase-0/Phase0Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                     |
| 2026-07-09 | Release 01 | 使用 persona sub-agent 模擬訪談  | 啟用三個 sub-agent 分別扮演回報者、資訊整理者、行動者，依固定格式指出看不懂、最怕錯誤與不敢相信的資訊                         | 部分採用    | 採用共同風險與疑問作為需求分析草稿；不把 AI 模擬回饋當成實際訪談或 v1 定案需求               | `docs/interview-notes.md`, `docs/interview-summary.md`, `docs/decisions.md`                                         |
| 2026-07-09 | Release 01 | 彙整訪談與需求取捨               | 建議 v1 暫定優先服務資訊整理者，並把自動預填、信心程度、下一步語氣列為誤導風險                                                | 部分採用    | 暫定方向符合 Phase 0 工作台現況，但仍需人類與小隊確認；拒絕直接把 persona 回饋轉成功能清單   | `docs/interview-summary.md`, `docs/decisions.md`                                                                    |
| 2026-07-09 | Release 01 | 追加資料管理者 sub-agent 訪談    | 依使用者要求只針對資料管理者，讓三個 sub-agent 分別從大量資料分流、查核誤判風險、交接可讀性回饋                               | 部分採用    | 採用「可信度高」「人工確認為真實」「準備下決策」可能混淆的觀察；不把模擬回饋直接當成 UI 修改 | `docs/interview-notes.md`, `docs/interview-summary.md`, `docs/decisions.md`, `docs/ai-log.md`                       |
| 2026-07-09 | Release 02 | 產生資訊流程與 Mermaid 流程圖    | 根據需求取捨決策，建議流程從原始資訊開始，加入人工確認、不能直接變成任務、候選草稿仍未確認與判斷紀錄                          | 部分採用    | 採用為流程設計草稿；仍需學員用 VS Code 預覽 Mermaid，並人工確認流程是否符合實際整理工作      | `docs/flow.md`                                                                                                      |
| 2026-07-09 | Release 02 | 調整流程為自動初判與最後確認     | 建議系統自動讀取來源、原文、時間與查核狀態，先標出缺漏、敏感風險與卡住原因，人工只在最後確認與修正                            | 採用        | 採用自動化初判以降低整理者負擔；但最後採用、不採用與查核狀態仍保留人工確認，避免 AI 判真偽   | `docs/flow.md`                                                                                                      |
| 2026-07-09 | Release 02 | 聚焦行動安全程度                 | 建議在本次流程假設中忽略個資與敏感資訊分支，改以行動安全程度不足、不能直接變成任務作為主要風險                                | 採用        | 採用使用者的新假設；但安全程度仍只能作提示與最後人工確認依據，不能讓 AI 自動派工或判真偽     | `docs/flow.md`                                                                                                      |
| 2026-07-09 | v1 實作    | 根據 flow.md 實作 `/v1/` 工作台  | 建議保留首頁 Phase 0 入口，新增 `/v1/`，用同一份 Phase 0 原始資訊顯示自動讀取、缺漏提示、行動安全程度、候選草稿與人工判斷紀錄 | 採用        | v1 只做前端暫存與提示，不新增資料源、不把草稿標成已確認、不自動建立救災任務                  | `src/app/App.tsx`, `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`           |
| 2026-07-09 | v1 實作    | 限制自動提示的語氣               | 建議所有流程輸出都顯示為「未確認或需要人工確認」，並提供人工修正或質疑 AI 預填欄位                                            | 採用        | 避免把信心程度或自動預填誤讀為已確認；人工判斷仍需小組後續檢查與修改                         | `src/features/v1/V1Workbench.tsx`, `docs/ai-log.md`                                                                 |
| 2026-07-09 | v1 修正    | 壓縮 v1 上方資訊密度             | 建議把「自動讀取」與「系統提示」改成緊湊雙欄，並刪除重複的「流程輸出」區塊                                                    | 採用        | 只調整畫面密度與重複資訊，不改查核狀態、不新增資料來源，也不把草稿變成已確認任務             | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`                              |
| 2026-07-09 | v1 修正    | 回復 v1 初版卡片版面             | 依使用者回饋，回復「自動讀取」與「系統提示」分成上下兩張卡的初版版面，但維持刪除「流程輸出」區塊                              | 採用        | 這次只回復畫面呈現偏好，不改資料規則、查核狀態或人工確認流程                                 | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `docs/ai-log.md`                                        |
| 2026-07-09 | v1 修正    | 加入資料可信度與人工調整         | 建議把自動判斷改為資料可信度高中低，並提供人工調整與「人工確認為真實」的最後查核結論                                          | 採用        | 可信度不同於行動安全程度；人工確認只寫在整理草稿，不改寫 Phase 0 原始資料狀態或自動派工      | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`            |
| 2026-07-09 | v1 修正    | 調整未審查與缺漏提示文案         | 建議將 `unverified` 與 `needs_review` 顯示統一為「未審查」，並將「需要先人工確認」改為「缺少關鍵資訊」                        | 採用        | 只改 UI 顯示文字，不改原始資料狀態；仍避免把未審查內容顯示為已確認                           | `src/components/status-labels.ts`, `src/features/v1/V1Workbench.tsx`, `tests/app-smoke.test.tsx`                    |
| 2026-07-09 | v1 修正    | 合併最後人工確認欄位             | 建議把「最後人工確認結果」與「人工最後查核結論」合併成單一選單，讓未審查、暫不採用、採用未確認、人工確認為真實集中在同一欄    | 採用        | 減少「尚未整理」與「未審查」重複顯示；仍只更新草稿狀態，不改原始資訊                         | `src/features/v1/V1Workbench.tsx`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`                                     |
| 2026-07-09 | v1 修正    | 修正人工確認為真實的位置         | 依使用者回饋，將「人工確認為真實」移回資料可信度選項，最後人工確認結果只保留未審查、暫不採用與採用未確認草稿                  | 採用        | 系統自動可信度只能產生高中低；人工確認為真實必須由整理者手動選，避免系統自動判真偽           | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`            |
| 2026-07-09 | v1 修正    | 調整左側列表狀態顯示             | 建議移除 v1 左側列表的原始未審查 badge，改由最後人工確認結果顯示狀態；建立整理草稿後預設為暫時不採用                          | 採用        | 左側列表聚焦整理結果，不再重複顯示原始查核狀態；原始狀態仍保留在自動讀取卡片                 | `src/features/v1/V1Workbench.tsx`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`                                     |
| 2026-07-09 | v1 修正    | 壓縮自動讀取與系統提示留白       | 建議只調整兩張上方卡片的 padding、段落 margin、列表 margin 與提示框行距，不改版面結構                                         | 採用        | 解決底部留白過多，同時保留使用者偏好的上下卡片版面                                           | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `docs/ai-log.md`                                        |
| 2026-07-09 | v1 修正    | 合併頂部統計指標                 | 建議移除「筆留下人工判斷」，只保留 Phase 0 原始資訊數與整理草稿數                                                             | 採用        | 草稿建立後預設暫時不採用，兩個統計容易重複；保留一個草稿數較清楚                             | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `docs/ai-log.md`                                        |
| 2026-07-09 | v1 修正    | 新增下一步行動工作區             | 建議在最後人工確認結果新增「準備下決策」，並只把這類草稿傳到下一步工作區選擇處理方向                                          | 採用        | 下一步工作區只整理人工處理方向，不自動派工、不做真實救災決策                                 | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`            |
| 2026-07-09 | v1 修正    | 新增確認依據與決策前檢查清單     | 建議在資料可信度選「人工確認為真實」時要求填確認依據，並在進入「準備下決策」前完成來源、時間、地點與非自動派工檢查            | 採用        | 讓人工確認留下可檢查依據，避免未確認資料太快流入下一步工作區                                 | `src/features/v1/V1Workbench.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`            |
| 2026-07-09 | v1 修正    | 修正 GitHub Pages v1 入口        | 建議新增 `v1/index.html` 並讓首頁與 v1 返回連結使用 Vite base URL，避免 GitHub Pages 專案子路徑點擊 `/v1/` 變 404             | 採用        | 只修展示入口與部署路徑，不改資料或流程判斷                                                   | `vite.config.ts`, `v1/index.html`, `src/app/App.tsx`, `src/features/v1/V1Workbench.tsx`, `tests/app-smoke.test.tsx` |
| 2026-07-09 | v1 修正    | 新增 v1 前端密碼門檻             | 建議進入 v1 前先顯示密碼表單，輸入課堂 demo 密碼後才顯示人工確認工作台                                                        | 採用        | 這只是前端展示門檻，不是正式安全驗證；不加入後端、帳號或真實權限系統                         | `src/app/App.tsx`, `src/styles/global.css`, `tests/app-smoke.test.tsx`, `docs/ai-log.md`                            |

## 範例

| 時間  | 階段    | 任務         | AI / Agent 建議                        | 採用 / 拒絕 | 人類判斷理由                              | 相關檔案 / commit             |
| ----- | ------- | ------------ | -------------------------------------- | ----------- | ----------------------------------------- | ----------------------------- |
| 09:45 | Phase 0 | 分析原始資訊 | 建議把社群貼文直接轉成 verified report | 拒絕        | 社群貼文來源未確認，應保持 `needs_review` | `docs/phase0-observations.md` |

## 課後反思

### AI 幫助最大的地方

-

### AI 最容易誤導的地方

-

### 下次使用 AI 開發前，我們會先準備

-

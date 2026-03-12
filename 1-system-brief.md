# Casino 高爾夫球隊 — 系統說明文件
# Casino Golf Society — System Brief

**版本：** 1.0 | **日期：** 2026-02-23 | **製作人：** Veronica Lin

---
---

# 繁體中文
---

## 1. 這是什麼

為 Casino 高爾夫球隊打造的私人網頁版投注管理工具，取代現有群組聊天加 Excel 的作業方式。會員可透過系統直接下注，也可照常在群組下注由會計代為登錄——兩個管道、同一套系統。系統自動計算並產生結算報表。

---

## 2. 解決的問題

- 會計手動從群組訊息整理投注資料，容易漏看或計算出錯
- 結算追蹤非正式，無完整紀錄可查
- **目標：** 給會計一套乾淨的工具，系統承擔所有計算

---

## 3. 使用者

| 角色 | 人數 | 說明 |
|------|------|------|
| 會計 | 1 | 資料輸入、報表、結算管理 |
| 管理員 | 2–3 | 監督與修正 |
| 會員 | 85 | 透過個人專屬連結查看賽事、投注紀錄與餘額；亦可自行下注或照常在群組下注 |

---

## 4. 賽制與計分

- **賽制：** 2 對 2，最佳桿（Best Ball）— 每洞取隊內較低桿數
- **每洞得分：** 贏洞 = 1分 ｜ 博蒂 = 2分 ｜ 老鷹 = 3分 ｜ 一桿進洞 = 4分 ⚑
- **洞位難度：** H1（最難）至 H18（最易），用於讓分分配
- **結果登錄：** 會計只需輸入最終賽果；逐洞追蹤由群組即時進行

---

## 5. 賽事類型

| 類型 | 日期 | 參與方式 |
|------|------|----------|
| 週一例行賽（平盤） | 週一 | 全體 85 名會員必須參與（球員或下注者）；上場球員須自押 5兩 |
| 固定隊內賽（一般版） | 週四或週五 | 自願（視球場檔期，提前 6–12 個月預訂） |
| 加強版 | 任意日期 | 自願，成員私下安排後開放全體投注 |

任何賽事日均可能同時進行多場比賽。球員自行選擇隊友，自然形成對戰組合。

---

## 6. 讓分制度

讓分條件由四名上場球員賽前協商，會計記錄類型與數值。

**讓點** — 強隊讓弱隊 N 點，從最難洞（H1）依序分配，每洞 +1 分。
*例：A 隊讓 B 隊 1 點 → B 隊在 H1 自動獲得 1 分。A 隊須在 H1 打出 2 分（博蒂）才能在該洞取得優勢。*

**讓洞** — 強隊讓弱隊在特定洞額外揮桿，取最佳成績作為該洞結果。⚑ *適用洞位待確認*

---

## 7. 投注制度

**單位**

| 術語 | 數值 |
|------|------|
| 1兩 | $1,000 NTD（基本單位，所有注額須為整數倍） |
| 1支 | 3兩 = $3,000 NTD |

**結構與抽水**
- 1:1 對賭制度：球員為莊家，承擔所有外部投注盈虧
- 球隊從**每位贏家的淨利**抽取 **5% 水錢**（四捨五入到百位 NTD）
- Casino 球隊可免費使用系統半年，此後收取水錢 1% 作為系統維護費用

**強制下注**
- 所有上場球員須自押 5兩（$5,000 NTD）於自己隊伍，不計入支容量；球員間私下轉讓，會計不介入
- 週一例行賽，全體會員均須下注

**容量制度（固定隊內賽與加強版）**
- 球員賽前設定支上限（例：20支 = 最多接受外部投注 60兩 / $60,000 NTD）
- 達上限後會計可詢問是否擴容；週一例行賽無容量上限

**週一強制投注**
- 截止時間：週日晚間 7:00 ⚑
- 截止後，會計為未下注的會員自動補注：1兩/場，押注於目前注額較少的一方
- 所有自動補注標記為「自動補注」，保留完整紀錄

**投注平衡邏輯**
1. 優先以未下注會員的自動補注填補弱勢方
2. 若仍失衡，依時序刪除超額投注（最後下注者最先刪除）

---

## 8. 結算

**每週報表** — 會計為每位會員產生本週賽事、投注、賽果與當月累計餘額，格式整潔可截圖分享群組。

**月結** — 所有款項每月結算一次，截止日為**每月第四個週一**。款項由會員自行點對點結清，系統僅作紀錄；會計標記每位會員為已結清或未結清，用於追蹤欠款。

---

## 9. 系統功能

| 功能 | 說明 |
|------|------|
| 會員名冊 | 管理全體 85 名會員資料 |
| 賽事管理 | 建立賽事、記錄讓分、輸入賽果 |
| 投注登錄 | 手動投注、自動補注、強制下注 |
| 容量追蹤 | 支上限管理、滿額提示、擴容操作 |
| 投注平衡 | 自動補注與刪注邏輯 |
| 每週報表 | 逐一會員摘要，可截圖 |
| 月度結算 | 餘額追蹤、已結清／未結清標記 |
| 儀表板 | 當前賽事摘要與下次結算截止日 |

---

## 10. 主辦人確認事項

所有規則已於 Session 22 與創隊長確認完畢。完整紀錄見 `memory/canonical-rules.md`（R1–R29）。

---
---

# ENGLISH
---

## 1. What This Is

A private web tool built for Casino Golf Society to replace the current group chat + Excel betting workflow. Members can place bets directly through the system or continue via group chat — two channels, one system. The bookkeeper handles LINE holdouts, oversees all bets, and the system does all calculations and generates settlement reports automatically.

---

## 2. The Problem

- Bookkeeper manually reads the group chat, extracts bet data, and tracks everything in Excel — errors and missed messages are inevitable
- No clean audit trail for settlements
- **Goal:** A structured tool where the system does the heavy lifting

---

## 3. Users

| Role | Count | Description |
|------|-------|-------------|
| Bookkeeper | 1 | Data entry, reports, settlement management |
| Admin | 2–3 | Oversight and corrections |
| Members | 85 | Access via personal link to view matches, bets, and balance; can also self-place bets or continue via group chat |

---

## 4. Scoring

- **Format:** 2v2, best ball per hole (lowest score of each pair counts)
- **Points per hole:** Win = 1pt | Birdie = 2pts | Eagle = 3pts | Hole-in-one = 4pts ⚑
- **Difficulty index:** H1 (hardest) to H18 (easiest) — used to assign handicap holes
- **Result entry:** Bookkeeper enters final match result only; hole-by-hole is tracked live in the group chat

---

## 5. Match Types

| Type | Day | Participation |
|------|-----|---------------|
| Monday Regular Match (Even Odds) | Monday | All 85 members must participate (as player or bettor); players must self-bet 5兩 |
| Fixed Team Match (Standard) | Thursday or Friday | Voluntary (course-dependent, booked 6–12 months ahead) |
| Surprise Match (Enhanced) | Any day | Voluntary — privately arranged, then opened to all members |

Multiple simultaneous matches may occur on any given day. Players choose their own teammates organically each week.

---

## 6. Handicap System

Agreed between the four players before the match. Bookkeeper records the type and value.

**讓點 (Concede Points)** — Stronger team concedes N points, distributed one per hole starting from H1.
*Example: Concede 1 point → Team B gets +1 free point on H1. Team A needs to score 2 points (e.g., birdie) on H1 to gain any advantage on that hole.*

**讓洞 (Concede Swings)** — Stronger team gives extra swings to the weaker team on specific holes; best swing counts as the hole result. ⚑ *Hole assignment pending confirmation*

---

## 7. Betting

**Units**

| Term | Value |
|------|-------|
| 1兩 | $1,000 NTD (base unit — all bets must be multiples) |
| 1支 | 3兩 = $3,000 NTD |

**Structure & Rake**
- 1:1 payout model — players act as house, absorbing all external bet flow
- Club takes **5% rake from each winner's net gain** (rounded to nearest $100 NTD)
- Casino Golf Society uses the system free for 6 months; thereafter a 1% system maintenance fee applies

**Mandatory Bets**
- All players must self-bet 5兩 ($5,000 NTD) on their own team — does not count toward 支 capacity; internal transfers are private and not tracked
- On Monday matches, all members are required to bet

**Capacity (Fixed Team Match & Surprise Match)**
- Players set a 支 limit before the match (e.g., 20支 = $60,000 NTD max from outside bettors)
- Bookkeeper can request expansion; Monday matches have **no capacity limit**

**Monday Mandatory Betting**
- Deadline: Sunday 7:00 PM ⚑
- After deadline, bookkeeper auto-places bets for members who missed — 1兩 per missed match, on the side with fewer bets
- All auto-placed bets are flagged in the system for audit trail

**Bet Balancing**
1. Fill imbalance first using auto-placement for members who haven't bet yet
2. If still unbalanced, drop excess bets from the over-subscribed side — latest bets dropped first

---

## 8. Settlement

**Weekly Report** — Bookkeeper generates a per-member report each week: matches, bets, results, and running monthly balance. Clean format, easy to screenshot and share in the group chat.

**Monthly Settlement** — All money settles once a month on the **4th Monday**. Members settle directly with each other — the system tracks balances only. Bookkeeper marks each member as Settled or Outstanding and follows up in the group chat.

---

## 9. System Features

| Feature | Description |
|---------|-------------|
| Member Roster | Manage all 85 members |
| Match Management | Create matches, log handicap, enter result |
| Bet Entry | Manual, auto-placed, and mandatory bets |
| Capacity Tracking | 支 limit management, fill status, expansion flow |
| Bet Balancing | Auto-placement + chronological drop logic |
| Weekly Report | Per-member snapshot, screenshottable |
| Monthly Settlement | Balance tracking, paid/unpaid status |
| Dashboard | Active matches and upcoming settlement date |

---

## 10. Organizer Confirmations

All rules confirmed with the organizer in Session 22. Full record in `memory/canonical-rules.md` (R1–R29).

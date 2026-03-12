# Canonical Rules — Flat Index
One line per sub-rule. Chinese description for quick discovery.
Source: `memory/canonical-rules.md` (frozen, do not edit).
Cluster files: `memory/rules/R*.md` (verbatim extracts).

## R1. DEFINITIONS
R1.1   賽事定義 (MATCH)
R1.2   賽事類型 (monday / optional)
R1.3   加強版修飾符 (SPORADIC MODIFIER — is_sporadic boolean)
R1.4   球員定義 (PLAYER — 每場 4 人)
R1.5   外部投注者 (EXTERNAL BETTOR)
R1.6   活躍會員 (ACTIVE MEMBER)
R1.7   授權操作者 (AUTHORIZED OPERATOR)
R1.8   隊伍代號 (MATCH SIDE — A / B)
R1.9   強制自投 (MANDATORY SELF-BET — 5兩, 系統自動建立)
R1.10  自動派注 (AUTO-PLACED BET — 1兩, 週一截止後)
R1.11  自願投注 (VOLUNTARY BET)
R1.12  容量定義 (CAPACITY — 支為單位)
R1.13  後進先出 (LIFO — 超額時的失效順序)
R1.14  資金流 1 (FLOW 1 — 輸家賭注 → 贏隊球員)
R1.15  資金流 2 (FLOW 2 — 贏家賭注 1:1 由輸隊球員支付)
R1.16  抽水定義 (RAKE — 贏家淨利的費用)
R1.17  系統費用 (PROVIDER FEE — 從抽水中抽取)
R1.18  月度結算 (SETTLEMENT)
R1.19  介紹人 (REFERRER — referrer_id FK)
R1.20  兩 (LIANG — 1兩 = 1,000 NTD)
R1.21  支 (ZHI — 1支 = 3兩 = 3,000 NTD)
R1.22  新台幣 (NTD — 結算最小單位)
R1.23  基點 (BPS — 10,000 BPS = 100%)
R1.24  整數除法 (FLOOR_DIV — 向負無窮取整)
R1.25  最小投注單位 (UNIT STEP — bet_increment_liang)
R1.26  待確認標記 ([OQ-n] 標記定義)

## R2. MATCH TYPES
R2.1   match_type 限 monday / optional
R2.2   DEPRECATED — is_sporadic 改用 sporadic_pools 表
R2.3   DEPRECATED — 見 R2.2
R2.4   無加強盤時適用基本規則
R2.5   有加強盤時 R5 附加生效（衝突時 R5 優先）
R2.6   DEPRECATED — min_bet / bet_increment 不再需要
R2.7   DEPRECATED
R2.8   DEPRECATED
R2.9   同日多場賽事可各自擁有加強盤

## R3. SCORING
R3.1   2v2 best ball, 18 洞
R3.2   計分：贏 1 / Birdie 2 / Eagle 3 / HIO 10
R3.3   H1 最難, H18 最易（讓分洞序依此）
R3.4   會計只輸入最終結果，系統不計算逐洞分數
R3.5   result 限 team_a / team_b / pending

## R4. HANDICAP
R4.1   handicap_type 限 讓點 / 讓洞 / 不讓分
R4.2   handicap_value 整數 >= 0
R4.3   不讓分時 handicap_value 必須為 0
R4.4   handicap_team = 強隊代號 (A/B)，不讓分時 null
R4.5   讓點規則（自 H1 起依難度序讓分）
R4.6   讓洞規則（系統只記錄，場上由球員自行處理）[OQ-1 已解決]
R4.7   讓分由 4 位球員賽前協議

## R5. SPORADIC MODIFIER RULES (加強版)
R5.1   每場可有 0~多個加強盤
R5.2   sporadic_pools 必填欄位（match_id, opened_by_team, handicap, capacity, result）
R5.3   同隊可開多盤（不同讓分條件）
R5.4   外部投注者不能投開盤方，只能投對面 [OQ-2 已解決]
R5.5   capacity_zhi NOT NULL, >= 20（軟上限，需手動確認）
R5.6   投注金額：3~150兩（1~50支），amount % 3 = 0
R5.7   每盤獨立結算（獨立結果、獨立賠付、獨立抽水）
R5.8   會計需分別輸入每盤結果
R5.9   同一投注者可投同場多盤
R5.10  超額時 LIFO 適用於每盤的 bet_requests
R5.11  非加強盤投注用賽事級讓分和結果，不受加強盤影響
R5.12  is_sporadic 已廢棄，改查 sporadic_pools 表
R5.13  週一有加強盤時：強制投注只適用基本盤，加強盤完全自願 [OQ-4 已解決]
R5.14  比賽格式不限 2v2（1v1, 1v2, 1v3 皆可）— 待未來討論

## R6. MONETARY UNITS
R6.1   1兩 = 1,000 NTD
R6.2   1支 = 3兩 = 3,000 NTD
R6.3   bet amount_liang 必須為正整數
R6.4   結算算術必須用 64-bit 整數 NTD
R6.5   兩→NTD 換算：ntd = liang x 1,000（精確）

## R7. MANDATORY SELF-BET
R7.1   賽事建立時系統自動為 4 位球員各建一筆強制自投
R7.2   自投屬性（金額依 R8.5、bet_type=mandatory_self、system/rule_engine）
R7.3   不可修改、不可刪除
R7.4   必須納入結算和賠付計算
R7.5   不計入 capacity_zhi
R7.6   不經 bet_requests，直接寫入 bets
R7.7   球員更換時：舊自投作廢 + 新自投建立（同一交易）

## R8. BET TYPES
R8.1   bet_type 限 mandatory_self / mandatory_monday / voluntary
R8.2   mandatory_self：系統自動建立（標準 5兩 / 小盤 3兩）
R8.3   mandatory_monday：週一截止後自動派注（1兩）
R8.4   voluntary：自願投注（基本盤見 R8.5，加強盤見 R5.6）
R8.5   投注配置：標準盤（自投 5兩、自願 1 或 2兩）/ 小盤（自投 3兩、自願僅 1兩）

## R9. MONDAY MANDATORY BETTING
R9.1   每位活躍會員在每場週一賽事必須有一筆投注
R9.2   球員以強制自投滿足 R9.1
R9.3   未投注的非球員會員於週日 7pm 後自動派注
R9.4   週日 7pm 截止全年適用，僅限週一賽事
R9.5   週一基本盤 capacity_zhi 必須為 null（無容量限制）
R9.6   週一強制投注只適用基本盤，加強盤完全自願 [OQ-4 已解決]

## R10. MONDAY AUTO-PLACEMENT ALGORITHM
R10.1  觸發：週日 7:02pm 後（2 分鐘寬限期）
R10.2  識別每場週一賽事中無任何投注的活躍會員
R10.3  每人產生一筆：1兩, mandatory_monday, system/scheduled_job
R10.4  三步分配演算法（人數平衡 → 金額平衡 → Unicode 字母序 tiebreaker）
R10.5  自動派注必須經 bet_requests 並即時接受（週一無容量限制）

## R11. BET VALIDITY RULES
R11.1  基本盤自願投注：標準 1 或 2兩，小盤僅 1兩
R11.2  加強盤投注：3~150兩, amount % 3 = 0
R11.3  DEPRECATED — min_bet / bet_increment 不再用於基本盤驗證
R11.4  強制自投（5兩）免除 R11.1 驗證
R11.5  自動派注（1兩）免除 R11.1 驗證

## R12. BET PIPELINE ROUTING
R12.1  mandatory_self 直接寫入 bets，不經 bet_requests
R12.2  所有其他投注必須先進 bet_requests
R12.3  capacity_zhi IS NULL 時：同一交易內即時自動接受
R12.4  capacity_zhi IS NOT NULL 時：依 R15 評估容量後決定

## R13. BET REQUESTS — SCHEMA AND LIFECYCLE
R13.1  bet_requests 表欄位定義（id, match_id, member_id, team, amounts, status, attribution）
R13.2  remaining_amount = requested - accepted（衍生值，不存儲）
R13.3  不變量：0 <= accepted_amount <= requested_amount
R13.4  狀態定義（pending / partially_accepted / accepted / rejected / expired）
R13.5  狀態轉換規則（7 種有效轉換，terminal 不可逆）
R13.6  status_reason 值（capacity_overflow_lifo / manual_reject / deadline_passed / match_cancelled）

## R14. BET LIFECYCLE
R14.1  bets 表欄位定義（id, match_id, member_id, team, amount, type, result, status, attribution）
R14.2  active：有效投注，納入結算
R14.3  voided：無效投注，必須排除於結算。不可逆
R14.4  void_reason 在 voided 時必填
R14.5  bets.result 在賽事結果輸入時原子寫入所有 active bets
R14.6  結算直接讀 bets.result，不可從 matches.result 重新推導

## R15. CAPACITY MANAGEMENT
R15.1  容量僅適用於 capacity_zhi IS NOT NULL 的賽事
R15.2  capacity_zhi = 每隊最大外部投注曝險（支為單位）
R15.3  軟上限：超額時不自動拒絕，存為 pending 讓操作者決定
R15.4  強制自投不計入 capacity_zhi
R15.CP 容量檢查程序（鎖定交易內執行，見 R27）
R15.5  capacity_zhi 可變；增加時依 created_at 順序處理 pending
R15.6  部分接受規則（accepted + remaining = requested，需符合單位倍數）
R15.7  LIFO 失效：超額時由最新到最舊依序拒絕

## R16. PAYOUT MODEL
R16.1  所有賽事類型均為 1:1 賠付
R16.2  球員扮演莊家角色，承擔所有外部投注資金流
R16.3  兩條獨立資金流（Flow 1 + Flow 2）
R16.4  外部投注者僅參與 Pass 1，不參與 Flow 1/Flow 2
R16.5  強制自投納入 total_losing / total_winning 計算
R16.6  voided bets 排除於所有資金流計算

## R17. PLAYER SHARE ALLOCATION
R17.1  球員分潤比例存於 match_team_player_shares 表
R17.2  表結構（match_id, match_side, player_id, share_bps, context, sporadic_pool_id）
R17.3  約束（UNIQUE 組合、share_bps 0~10000、每組合 SUM = 10000）
R17.4  預設均分演算法（base + remainder 分配，依 player_id 升序）
R17.5  手動分潤用整數百分比（UI %，DB BPS），SUM 必須 = 10000
R17.6  結算必須引用 share_bps，不可假設均分
R17.7  分潤比例僅適用 Flow 1 / Flow 2，自投為個人賭注
R17.8  每場賽事獨立設定分潤
R17.9  分潤可修改至 status = active 為止，之後鎖定
R17.10 封盤後、開賽前仍可修改分潤
R17.11 基本盤最低曝險規則（每位球員 >= 20兩，不足時自動調整 + 通知會計）
R17.12 加強盤無最低曝險，任意整數 % 皆可（含 100/0）

## R18. ARITHMETIC STANDARD
R18.1  結算算術必須用 64-bit 整數（BIGINT）
R18.2  所有結算金額以整數 NTD 表示
R18.3  floor_div 定義（向負無窮取整）
R18.4  比例分配演算法（base + remainder，依 player_id 升序 +1 NTD）
R18.5  中間乘積必須以 64-bit 計算後再除

## R19. RAKE CALCULATION
R19.1  抽水僅對贏家個別計算，輸家不抽水
R19.2  贏家定義：net_gain_liang > 0
R19.3  抽水永遠 >= 0
R19.4  抽水公式（5% → NTD → 四捨五入到百位 → 換回兩）
R19.5  抽水歸俱樂部

## R20. PROVIDER FEE
R20.1  系統費用設定存於 club_billing_config（每俱樂部一列）
R20.2  表結構（club_id, provider_rate_bps, free_period_months, contract_start_date, billing_enabled）
R20.3  免費期結束日計算（contract_start + N months）
R20.4  系統費用公式（floor_div(rake_ntd x rate_bps, 10000)，免費期內為 0）
R20.5  provider_fee_reason 限 free_period / standard
R20.6  即使費用為 0 也必須建立記錄
R20.7  費率以結算時為準，已結算記錄不回溯重算

## R21. SETTLEMENT CALCULATION
R21.1  結算由資料庫自動計算，會計不可手動輸入金額
R21.2  每場每人需完成兩個 pass
R21.P1 Pass 1 — 外部投注者（讀 bets 表：win +amount, loss -amount, voided 排除）
R21.P2 Pass 2 — 球員資金流（Flow 1 收入 + Flow 2 負債，依 share_bps 分配）
R21.RK 抽水計算（兩 pass 後，net_gain > 0 時依 R19 計算）
R21.PF 系統費用計算（依 R20）
R21.3  月度合計（gross / rake / provider_fee / net，正=應收 負=應付）
R21.4  同一賽事中同時為投注者和球員時，兩者獨立合計
R21.5  強制審計：獨立計算兩次，結果不符時阻擋確認
R21.6  停用會員負債轉介紹人
R21.7  唯一約束：每人每月一筆 settlement

## R22. SETTLEMENT LIFECYCLE
R22.1  status 限 pending / settled
R22.2  pending：計算完成，尚未確認付款
R22.3  settled：已確認付款，不可逆
R22.4  月度結算，每月第四個週一交款
R22.5  每週報表（當週賽事、投注、累計月度餘額）
R22.6  系統追蹤餘額但不實際處理金流，結算為點對點

## R23. MATCH LIFECYCLE
R23.1  status 限 scheduled / betting_closed / active / cancelled / completed
R23.2  scheduled：初始狀態，可排球員、可投注、可取消投注
R23.3  betting_closed（封盤）：會員無法修改；會計保有完整修改權（隱藏功能）；可重開；全額降注
R23.4  active：進行中，球員/投注/分潤全部鎖定
R23.5  completed：結果已輸入，不可變。終態
R23.6  cancelled：取消，所有投注作廢。終態
R23.7  狀態轉換規則（6 種有效轉換，completed/cancelled 不可逆）
R23.8  封盤觸發（週一：週日 7pm 自動 / 手動提前；其他：僅手動）
R23.9  投注取消規則（scheduled 可取消、betting_closed 僅會計、active+ 不可）
R23.10 結果輸入（原子交易：設 result + 寫所有 bets.result；加強盤各自獨立）
R23.11 結果更正（原子交易：改 result + 翻轉所有 bets.result；需重算結算）

## R24. MATCH CANCELLATION
R24.1  取消時原子交易（matches.status + bets voided + requests expired）
R24.2  voided bets 排除於結算
R24.3  expired requests 不進入結算
R24.4  比賽中取消 [OQ-3 已解決]：非天氣=全部作廢 / 天氣=裁決（領先分>=剩餘洞=贏，否則作廢）

## R25. PLAYER CHANGES
R25.1  球員更換僅限 scheduled 狀態
R25.2  active 後球員鎖定
R25.3  更換程序（舊自投 voided + 新自投建立，同一交易）
R25.4  新球員已有自願投注時阻擋，需先處理衝突

## R26. BET ATTRIBUTION FIELDS
R26.1  created_by_role 限 member / bookkeeper / system
R26.2  created_via 限 manual / rule_engine / scheduled_job / import / api
R26.3  有效組合（member→manual/api, bookkeeper→manual/import/api, system→rule_engine/scheduled_job）
R26.4  created_by_user_id（member/bookkeeper 必填, system 必為 null）
R26.5  created_by_service（api 必填, 非 api 必為 null）
R26.6  member + import 為無效組合
R26.7  系統投注歸屬（mandatory_self→system/rule_engine, mandatory_monday→system/scheduled_job）
R26.8  bets 和 bet_requests 都必須包含所有歸屬欄位

## R27. CONCURRENCY RULES
R27.1  容量評估和投注接受必須在序列化交易內執行
R27.2  評估前必須取得 row-level lock（SELECT ... FOR UPDATE）
R27.3  鎖定後重新計算容量（鎖前讀取無效）
R27.4  交易必須原子包含：容量檢查 + bets 插入 + requests 更新
R27.5  同一賽事的兩個同時接受操作不可超出 capacity_zhi

## R28. PENDING ORGANIZER CONFIRMATIONS
OQ-1   讓洞規則：已解決（系統只記錄，球員自行處理）
OQ-2   加強盤投注限制：已解決（不能投開盤方，只能投對面）
OQ-3   比賽中取消：已解決（非天氣全部作廢 / 天氣裁決）
OQ-4   週一 + 加強盤：已解決（強制投注只適用基本盤）
OQ-5   輸隊球員分潤：已解決（可自訂比例，預設 50/50，基本盤最低 20兩）
OQ-5a  封盤規則：已解決（新狀態 betting_closed，可重開）
OQ-5b  投注取消：已解決（僅 scheduled 狀態可取消）
OQ-5c  基本盤自願投注金額：已解決（1兩或 2兩，無其他選項）
OQ-5d  加強盤投注上下限：已解決（1~50支，capacity >= 20支）
OQ-6   會員投注修改：已解決（封盤前可改，封盤後不可，維護者隱藏覆寫）
OQ-7   截止時間邊界：已解決（按鈕時間為準 + 2 分鐘寬限）
OQ-8   強制自投建立：已解決（系統自動建立）
OQ-9   賽後可見性：非俱樂部規則，系統設計決定
OQ-10  週日 7pm 全年適用：已解決（無例外）
OQ-11  HIO 計分：已解決（10 分，但系統不計算逐洞）

## R29. SYSTEM MAINTAINER OVERRIDE
R29.1  隱藏覆寫功能僅限系統維護者（Veronica）
R29.2  封盤後可修改任何投注資料（金額、隊伍、取消、重建）
R29.3  不出現在任何 UI 中（會員 / 會計均不可見）
R29.4  所有覆寫操作必須記錄於 audit_log
R29.5  audit_log 為 append-only，不可修改或刪除
R29.6  覆寫後仍經正常結算自動計算
R29.7  用途：緊急修正，非日常操作
R29.8  未來：3-4 個管理帳號，各有不同權限（Phase 1 單一會計角色）

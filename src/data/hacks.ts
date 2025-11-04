import type { Locale } from '../i18n/translations'
import { formatRelativeDate } from '../utils/text'

export type Hack = {
  id: string
  rank: number
  upvotes: number
  comments: number
  shares: number
  createdAt: string
  author: {
    name: string
    role: string
  }
  hashtags: string[]
  description: string
  // optional fields used by points API
  topicId?: string
  position?: 'agree' | 'others'
}

export const hacks: Hack[] = [
  {
    id: 'hack-01',
    rank: 1,
    upvotes: 942,
    comments: 86,
    shares: 118,
    createdAt: '2024-01-18T06:30:00.000Z',
    author: { name: '林宥辰', role: '產品總監' },
    hashtags: ['#晨間儀式', '#深度工作'],
    description:
      '起床後先寫出「今天只要完成就會很滿意的一件事」，再打開任何聊天工具。當專注有了主心骨，就不會被碎訊息帶著跑。',
  },
  {
    id: 'hack-02',
    rank: 2,
    upvotes: 901,
    comments: 73,
    shares: 104,
    createdAt: '2024-02-03T08:00:00.000Z',
    author: { name: '陳沛綺', role: 'UI 設計師' },
    hashtags: ['#番茄鐘', '#可視化進度'],
    description:
      '把番茄鐘設定成 30 分鐘專注、10 分鐘伸展，再把完成次數貼在螢幕邊。視覺化的刻度會提醒你專注時間真的累積起來了。',
  },
  {
    id: 'hack-03',
    rank: 3,
    upvotes: 882,
    comments: 65,
    shares: 95,
    createdAt: '2024-01-29T05:45:00.000Z',
    author: { name: '王柏諺', role: '行銷顧問' },
    hashtags: ['#能量管理', '#時間區塊'],
    description:
      '每週做一張「能量地圖」：列出讓你充電或耗電的人事物，下週行程盡量先安排充電事件，剩下的空檔再填會消耗的任務。',
  },
  {
    id: 'hack-04',
    rank: 4,
    upvotes: 845,
    comments: 64,
    shares: 101,
    createdAt: '2024-02-12T04:20:00.000Z',
    author: { name: '江冠儀', role: '工程經理' },
    hashtags: ['#過濾會議', '#投資報酬'],
    description:
      '收到會議邀請先問：「這個時間是我能提供獨有價值嗎？」如果答案是否定的，就請主揪提供簡報或會後摘要即可。',
  },
  {
    id: 'hack-05',
    rank: 5,
    upvotes: 803,
    comments: 58,
    shares: 89,
    createdAt: '2024-03-01T02:10:00.000Z',
    author: { name: '劉昱臻', role: '創業者' },
    hashtags: ['#儀式感', '#自我檢視'],
    description:
      '每天睡前寫三行日記：今天最驕傲的小事、下一步要前進的方向、還有一句想對明天的自己說的話。這會讓動力延續到隔天早上。',
  },
  {
    id: 'hack-06',
    rank: 6,
    upvotes: 764,
    comments: 41,
    shares: 72,
    createdAt: '2024-02-24T10:00:00.000Z',
    author: { name: '張瑞庭', role: 'B2B 業務' },
    hashtags: ['#冷啟動', '#社交能量'],
    description:
      '每天固定在 10:30 寄出第一封高價值信件，為一天設定成功的基調。記得在結尾提供明確下一步，回覆率會成長一倍。',
  },
  {
    id: 'hack-07',
    rank: 7,
    upvotes: 731,
    comments: 49,
    shares: 77,
    createdAt: '2024-03-05T07:40:00.000Z',
    author: { name: '連語珊', role: '資料分析師' },
    hashtags: ['#資料儀表板', '#回顧節奏'],
    description:
      '打造自己的「成果儀表板」：每週五更新一次 KPI 與關鍵洞察，週一早上只要複習五分鐘，就知道本週優先要推進什麼。',
  },
  {
    id: 'hack-08',
    rank: 8,
    upvotes: 702,
    comments: 45,
    shares: 68,
    createdAt: '2024-02-28T06:55:00.000Z',
    author: { name: '方志豪', role: '自由開發者' },
    hashtags: ['#異步協作', '#重複利用'],
    description:
      '把每次客戶問過的問題寫成固定回覆模板，存在 Notion。三個月後我省下了 40% 的回信時間，而且回答更一致。',
  },
  {
    id: 'hack-09',
    rank: 9,
    upvotes: 668,
    comments: 37,
    shares: 63,
    createdAt: '2024-03-08T03:30:00.000Z',
    author: { name: '蘇倩瑜', role: '科研專案經理' },
    hashtags: ['#焦點時間', '#紙本筆記'],
    description:
      '每次專注工作前都會先在紙上寫出：「這 45 分鐘要完成的具體成果」。讓手先動起來，大腦就比較不會拖延。',
  },
  {
    id: 'hack-10',
    rank: 10,
    upvotes: 641,
    comments: 32,
    shares: 58,
    createdAt: '2024-03-12T09:20:00.000Z',
    author: { name: '謝孟軒', role: '資深客服' },
    hashtags: ['#情緒切換', '#呼吸練習'],
    description:
      '服務壓力很大，我會在每通棘手電話後進行三次 4-7-8 呼吸：吸四拍、憋七拍、吐八拍。讓怒氣在下一位客戶前消散。',
  },
  {
    id: 'hack-11',
    rank: 11,
    upvotes: 612,
    comments: 28,
    shares: 52,
    createdAt: '2024-03-14T04:10:00.000Z',
    author: { name: '黃靖倫', role: '軟體架構師' },
    hashtags: ['#限制時間', '#原型優先'],
    description:
      '開發新功能前先做「兩小時極速原型」：不考慮最完美的寫法，先用最快方式驗證體驗。剩下時間才投入在真正值得優化的細節。',
  },
  {
    id: 'hack-12',
    rank: 12,
    upvotes: 584,
    comments: 31,
    shares: 49,
    createdAt: '2024-03-16T05:50:00.000Z',
    author: { name: '楊苡蓁', role: '法律顧問' },
    hashtags: ['#高效閱讀', '#議題索引'],
    description:
      '把常用的法條整理成「議題索引卡」，遇到類似案件就能快速跳轉到過往註記，從搜尋到完成草案只要以前的一半時間。',
  },
  {
    id: 'hack-13',
    rank: 13,
    upvotes: 552,
    comments: 24,
    shares: 44,
    createdAt: '2024-03-18T08:35:00.000Z',
    author: { name: '邱柏妤', role: '教育訓練講師' },
    hashtags: ['#倒推排程', '#教案模組'],
    description:
      '先設定學員結訓後要做到的三個行為，再倒推課綱與教材模組。每次只調整模組就能快速產出客製課程。',
  },
  {
    id: 'hack-14',
    rank: 14,
    upvotes: 531,
    comments: 22,
    shares: 39,
    createdAt: '2024-03-21T07:15:00.000Z',
    author: { name: '張乃文', role: '產品營運' },
    hashtags: ['#跨部門同步', '#每日摘要'],
    description:
      '建立 Slack 每日摘要：固定下午五點自動整理今日進度、阻礙與明日目標。跨部門不再問重複的狀況，只需回覆補充。',
  },
  {
    id: 'hack-15',
    rank: 15,
    upvotes: 498,
    comments: 19,
    shares: 35,
    createdAt: '2024-03-24T06:05:00.000Z',
    author: { name: '曾柔羽', role: '影音創作者' },
    hashtags: ['#批次製作', '#腳本模版'],
    description:
      '把拍攝流程拆成「靈感清單、腳本改寫、錄影、剪輯」四個批次，只換一種腦袋模式。一天可以完成三支短影片。',
  },
  {
    id: 'hack-16',
    rank: 16,
    upvotes: 472,
    comments: 21,
    shares: 33,
    createdAt: '2024-03-27T04:45:00.000Z',
    author: { name: '蔡敬維', role: '財務長' },
    hashtags: ['#決策框架', '#風險評估'],
    description:
      '重要決策只問三件事：最壞情況是什麼？我是否承擔得起？有沒有更小的實驗。回答完就能避免在同個議題打轉。',
  },
  {
    id: 'hack-17',
    rank: 17,
    upvotes: 451,
    comments: 17,
    shares: 30,
    createdAt: '2024-03-29T11:00:00.000Z',
    author: { name: '林語晴', role: '人資夥伴' },
    hashtags: ['#一對一', '#成長紀錄'],
    description:
      '每次一對一會議，員工先填「最近最得意與最挫折的事情」，我在會議中只追問支持與阻礙。對談更聚焦，也更有人味。',
  },
  {
    id: 'hack-18',
    rank: 18,
    upvotes: 436,
    comments: 16,
    shares: 28,
    createdAt: '2024-03-30T02:55:00.000Z',
    author: { name: '鄭鎧倫', role: '產品研究員' },
    hashtags: ['#用戶訪談', '#洞察庫'],
    description:
      '訪談後的重點不是逐字稿，而是立刻寫下一句「這場訪談教我的事」。堆疊成洞察卡片，產品策略討論直接引用。',
  },
  {
    id: 'hack-19',
    rank: 19,
    upvotes: 412,
    comments: 14,
    shares: 27,
    createdAt: '2024-04-01T07:25:00.000Z',
    author: { name: '吳昭妤', role: '醫療專員' },
    hashtags: ['#輪班能量', '#小憩技巧'],
    description:
      '夜班必備 17 分鐘小睡，搭配咖啡因微劑量：先喝半杯黑咖啡再睡，醒來剛好咖啡因發揮作用，精神能撐四小時。',
  },
  {
    id: 'hack-20',
    rank: 20,
    upvotes: 397,
    comments: 13,
    shares: 25,
    createdAt: '2024-04-02T09:10:00.000Z',
    author: { name: '郭映廷', role: '社群經營' },
    hashtags: ['#內容再利用', '#社群節奏'],
    description:
      '每週安排「內容升級日」，把成效最好的貼文改成長內容或短影音，讓舊靈感長出三種型態。',
  },
  {
    id: 'hack-21',
    rank: 21,
    upvotes: 376,
    comments: 12,
    shares: 21,
    createdAt: '2024-04-04T05:40:00.000Z',
    author: { name: '簡韶安', role: '資安顧問' },
    hashtags: ['#每日學習', '#知識卡片'],
    description:
      '每天為當天學到的知識寫一張 150 字卡片，包括問題、解法與適用場景。兩個月後就有自己的知識圖譜。',
  },
  {
    id: 'hack-22',
    rank: 22,
    upvotes: 351,
    comments: 10,
    shares: 19,
    createdAt: '2024-04-06T03:55:00.000Z',
    author: { name: '杜宜芳', role: '客服培訓師' },
    hashtags: ['#逆向檢討', '#情境劇本'],
    description:
      '整理最常出錯的十種客訴情境，帶著團隊反向演練。每次回放都能找出模組化的解法，新人上線也更安心。',
  },
  {
    id: 'hack-23',
    rank: 23,
    upvotes: 332,
    comments: 9,
    shares: 18,
    createdAt: '2024-04-07T08:25:00.000Z',
    author: { name: '馮柏睿', role: '產品PM' },
    hashtags: ['#決策日記', '#後見之明'],
    description:
      '重大決策都寫在決策日記裡，記錄當時的資訊與假設。三個月後回頭檢查，能快速看出自己常忽略的風險。',
  },
  {
    id: 'hack-24',
    rank: 24,
    upvotes: 315,
    comments: 8,
    shares: 16,
    createdAt: '2024-04-09T04:05:00.000Z',
    author: { name: '葉佳穎', role: '永續顧問' },
    hashtags: ['#低碳通勤', '#儀式感開始'],
    description:
      '把通勤改成 15 分鐘的步行與播客時間，途中會在固定咖啡店寫下今日待完成的 Impact List，讓工作日有儀式感地展開。',
  },
  {
    id: 'hack-25',
    rank: 25,
    upvotes: 298,
    comments: 9,
    shares: 15,
    createdAt: '2024-04-10T06:30:00.000Z',
    author: { name: '段子棋', role: '資深採購' },
    hashtags: ['#議價腳本', '#數據備忘'],
    description:
      '每次談判前都準備「三段式議價腳本」，搭配歷史價格表。一旦對方出招，直接照著腳本回應，心裡穩定很多。',
  },
  {
    id: 'hack-26',
    rank: 26,
    upvotes: 284,
    comments: 9,
    shares: 14,
    createdAt: '2024-04-11T08:00:00.000Z',
    author: { name: '游芷勻', role: 'PMO 顧問' },
    hashtags: ['#會議節奏', '#雙週節點'],
    description:
      '專案更新採固定雙週節點，其他時間用共享文件更新。真正的開會時間留給協調決策，大家都更有耐心。',
  },
  {
    id: 'hack-27',
    rank: 27,
    upvotes: 271,
    comments: 8,
    shares: 14,
    createdAt: '2024-04-12T07:20:00.000Z',
    author: { name: '羅哲棋', role: 'AI 產品經理' },
    hashtags: ['#Prompt 範本', '#實驗紀錄'],
    description:
      '整理出常用 Prompt 範本，並記錄輸出結果與調整心得。新題目先從範本開始改，能省下大量摸索時間。',
  },
  {
    id: 'hack-28',
    rank: 28,
    upvotes: 256,
    comments: 8,
    shares: 13,
    createdAt: '2024-04-13T05:55:00.000Z',
    author: { name: '吳映蓉', role: '高校老師' },
    hashtags: ['#翻轉教室', '#暖身提問'],
    description:
      '課前一天寄出暖身提問，課堂開始先讓學生分享各自答案，再進入講解。學生參與度跟專注力都提升。',
  },
  {
    id: 'hack-29',
    rank: 29,
    upvotes: 242,
    comments: 7,
    shares: 12,
    createdAt: '2024-04-14T04:45:00.000Z',
    author: { name: '韓雅筑', role: '健康教練' },
    hashtags: ['#能量餐盤', '#週計畫'],
    description:
      '週日晚間先排好下一週的能量餐盤，運動與飲食搭配好就不容易放棄。客戶也跟著建立健康節奏。',
  },
  {
    id: 'hack-30',
    rank: 30,
    upvotes: 229,
    comments: 7,
    shares: 12,
    createdAt: '2024-04-15T03:25:00.000Z',
    author: { name: '張辰逸', role: '遠距協作教練' },
    hashtags: ['#時區共識', '#工作說明'],
    description:
      '跨時區協作時，所有任務都寫上「輸入 / 產出 / 所需背景」。對方即使在凌晨看到，也能立刻動起來。',
  },
  {
    id: 'hack-31',
    rank: 31,
    upvotes: 218,
    comments: 6,
    shares: 11,
    createdAt: '2024-04-16T09:45:00.000Z',
    author: { name: '郭纓霖', role: '客服主管' },
    hashtags: ['#情緒溫度計', '#班前會'],
    description:
      '每天班前會用 1 到 5 的情緒溫度計讓同仁自評，再調整分配難度不同的客戶。服務品質跟流失率明顯改善。',
  },
  {
    id: 'hack-32',
    rank: 32,
    upvotes: 205,
    comments: 6,
    shares: 11,
    createdAt: '2024-04-17T05:10:00.000Z',
    author: { name: '林以柔', role: '品牌文案' },
    hashtags: ['#語感採集', '#靈感碎片'],
    description:
      '散步時用手機錄下街頭語感，晚上挑三句改寫成品牌語氣。平日累積的語料能在提案時派上用場。',
  },
  {
    id: 'hack-33',
    rank: 33,
    upvotes: 194,
    comments: 6,
    shares: 10,
    createdAt: '2024-04-18T06:55:00.000Z',
    author: { name: '洪煜翔', role: '遊戲策劃' },
    hashtags: ['#玩法拆解', '#競品筆記'],
    description:
      '每週拆解一款競品遊戲，重點記錄留存與付費設計。開發會議直接引用，讓討論更聚焦。',
  },
  {
    id: 'hack-34',
    rank: 34,
    upvotes: 182,
    comments: 5,
    shares: 9,
    createdAt: '2024-04-19T04:15:00.000Z',
    author: { name: '蘇靜岑', role: '數據工程師' },
    hashtags: ['#資料稽核', '#自動化檢查'],
    description:
      '為每個管線設定「健康檢查 SQL」，只要異常就發 Slack 通知。多數 bug 能在使用者抱怨前就解決。',
  },
  {
    id: 'hack-35',
    rank: 35,
    upvotes: 174,
    comments: 5,
    shares: 9,
    createdAt: '2024-04-20T07:05:00.000Z',
    author: { name: '楊婕安', role: 'UX 研究員' },
    hashtags: ['#觀察日誌', '#極端使用者'],
    description:
      '每個季度都安排與極端使用者的跟訪，並把觀察寫成日誌給產品團隊。靈感常常就藏在少數案例裡。',
  },
  {
    id: 'hack-36',
    rank: 36,
    upvotes: 166,
    comments: 5,
    shares: 8,
    createdAt: '2024-04-21T08:50:00.000Z',
    author: { name: '陳家齊', role: '企業講師' },
    hashtags: ['#故事模組', '#案例庫'],
    description:
      '把演講故事拆成數個模組，只要知道聽眾需求就能快速組合。準備時間比以前少了一半。',
  },
  {
    id: 'hack-37',
    rank: 37,
    upvotes: 159,
    comments: 4,
    shares: 8,
    createdAt: '2024-04-22T05:40:00.000Z',
    author: { name: '黃思函', role: '財報分析師' },
    hashtags: ['#五分鐘快讀', '#關鍵指標'],
    description:
      '每份財報都先用五分鐘寫下三個亮點與三個疑點，再進入細節。速度變快，也更容易找出真正的風險。',
  },
  {
    id: 'hack-38',
    rank: 38,
    upvotes: 151,
    comments: 4,
    shares: 8,
    createdAt: '2024-04-23T03:55:00.000Z',
    author: { name: '周語婕', role: '社會創業者' },
    hashtags: ['#社群迴響', '#月度實驗'],
    description:
      '每月挑一個社會議題做小型實驗，結果整理成圖卡分享。群眾參與度跟募資轉換率都上升。',
  },
  {
    id: 'hack-39',
    rank: 39,
    upvotes: 143,
    comments: 4,
    shares: 7,
    createdAt: '2024-04-24T06:05:00.000Z',
    author: { name: '范奕廷', role: '政策研究員' },
    hashtags: ['#資料備份', '#版本追蹤'],
    description:
      '政策資料一律存在共享資源庫並明確標示版本號。任何人都能追蹤變更，團隊討論效率大幅提升。',
  },
  {
    id: 'hack-40',
    rank: 40,
    upvotes: 138,
    comments: 4,
    shares: 7,
    createdAt: '2024-04-25T05:15:00.000Z',
    author: { name: '連思穎', role: '公關顧問' },
    hashtags: ['#危機SOP', '#媒體地圖'],
    description:
      '提前整理危機處理 SOP 與媒體聯絡地圖，集體演練三次。真的遇到事件時，團隊 10 分鐘內就能上線。',
  },
  {
    id: 'hack-41',
    rank: 41,
    upvotes: 132,
    comments: 3,
    shares: 7,
    createdAt: '2024-04-26T04:25:00.000Z',
    author: { name: '許庭瑄', role: '資訊安全工程師' },
    hashtags: ['#紅隊演練', '#待辦清單'],
    description:
      '每次紅隊演練後立即開設 24 小時內的改善清單。確保所有漏洞都有負責人與截止日。',
  },
  {
    id: 'hack-42',
    rank: 42,
    upvotes: 126,
    comments: 3,
    shares: 6,
    createdAt: '2024-04-27T08:35:00.000Z',
    author: { name: '方建宇', role: '後端開發' },
    hashtags: ['#觀察指標', '#錯誤看板'],
    description:
      '重要服務的錯誤率、延遲指標都同步到團隊看板。異常時第一時間就有人看到，能快速處理。',
  },
  {
    id: 'hack-43',
    rank: 43,
    upvotes: 121,
    comments: 3,
    shares: 6,
    createdAt: '2024-04-28T07:05:00.000Z',
    author: { name: '簡蕙慈', role: 'HRBP' },
    hashtags: ['#人才雷達', '#月度對話'],
    description:
      '建立人才雷達表，標記每位同仁想學的技能。月度對話時就能安排資源，避免人才流失。',
  },
  {
    id: 'hack-44',
    rank: 44,
    upvotes: 116,
    comments: 3,
    shares: 6,
    createdAt: '2024-04-29T06:10:00.000Z',
    author: { name: '賴柏翰', role: '投資分析師' },
    hashtags: ['#晨間盤前', '#情境推演'],
    description:
      '開盤前用 20 分鐘寫下三種市場情境與應對策略。遇到波動時照著清單執行，不再慌張。',
  },
  {
    id: 'hack-45',
    rank: 45,
    upvotes: 112,
    comments: 3,
    shares: 5,
    createdAt: '2024-04-30T05:55:00.000Z',
    author: { name: '邵雅嫻', role: '機構設計師' },
    hashtags: ['#物料模組', '#測試手冊'],
    description:
      '把常用物料設計成模組化零件，測試結果也寫進手冊。新案子直接套用，大幅縮短開發期。',
  },
  {
    id: 'hack-46',
    rank: 46,
    upvotes: 107,
    comments: 2,
    shares: 5,
    createdAt: '2024-05-01T06:20:00.000Z',
    author: { name: '蘇柏廷', role: '硬體研發' },
    hashtags: ['#失敗日記', '#原型實驗'],
    description:
      '每次壞掉的原型都拍照寫成「失敗日記」，包含原因與推測。過一陣子回頭看，很容易找到改良方向。',
  },
  {
    id: 'hack-47',
    rank: 47,
    upvotes: 101,
    comments: 2,
    shares: 5,
    createdAt: '2024-05-02T07:50:00.000Z',
    author: { name: '游欣桐', role: '客服設計' },
    hashtags: ['#語音腳本', '#自助服務'],
    description:
      '重新設計語音客服腳本，把 80% 常見問題導向自助服務。平均等候時間下降 30%。',
  },
  {
    id: 'hack-48',
    rank: 48,
    upvotes: 96,
    comments: 2,
    shares: 4,
    createdAt: '2024-05-03T08:35:00.000Z',
    author: { name: '鍾元皓', role: '區塊鏈工程師' },
    hashtags: ['#安全審查', '#多簽流程'],
    description:
      '部署前一定請第三方進行合約審查，並啟用多簽流程。即使趕工也不跳過，安全性最重要。',
  },
  {
    id: 'hack-49',
    rank: 49,
    upvotes: 91,
    comments: 2,
    shares: 4,
    createdAt: '2024-05-04T06:45:00.000Z',
    author: { name: '李采芸', role: '職涯教練' },
    hashtags: ['#成果存摺', '#回饋提問'],
    description:
      '鼓勵學員建立「成果存摺」，紀錄每週兩件小成功。下次面談直接從存摺挑亮點。',
  },
  {
    id: 'hack-50',
    rank: 50,
    upvotes: 86,
    comments: 2,
    shares: 4,
    createdAt: '2024-05-05T05:30:00.000Z',
    author: { name: '杜維翔', role: '新創 CEO' },
    hashtags: ['#週三無會日', '#創意時段'],
    description:
      '公司規定週三上午不排任何會議，全體成員留給創意專案。大家反而更期待分享成果。',
  },
]

export function mapHackToLocale(hack: Hack, locale: Locale) {
  return {
    ...hack,
    // 多語系僅影響站內 UI，不轉換使用者或資料內容
    postedAtLabel: formatRelativeDate(hack.createdAt, locale),
  }
}

// 新命名：Point（保留相容導出）
export type Point = Hack
export const points: Point[] = hacks
export function mapPointToLocale(point: Point, locale: Locale) {
  return mapHackToLocale(point, locale)
}

export const defaultMockDocuments = [
  { id: 1, file_name: "alpha-report.pdf", state: "SUCCESS" },
  { id: 2, file_name: "beta-report.pdf", state: "QUEUED" },
  { id: 3, file_name: "gamma-alpha.pdf", state: "FAILED" },
];

export const defaultMockPages = [
  {
    id: 1,
    doc: "1",
    page_number: 1,
    image: "/test_1-1.png",
    width_px: 1000,
    height_px: 800,
  },
  {
    id: 2,
    doc: "1",
    page_number: 2,
    image: "/test_1-2.png",
    width_px: 1000,
    height_px: 800,
  },
];

export const defaultMockWords = [
  {
    id: 1,
    page: 1,
    page__page_number: 1,
    page__doc: "1",
    bbox: [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    content: "テスト語",
    direction: 1,
  },
];

export const queryRoutingMockPages = [
  {
    id: 101,
    page_number: 1,
    image: "/doc1-page1.png",
    width_px: 1000,
    height_px: 800,
    doc: "1",
  },
  {
    id: 201,
    page_number: 1,
    image: "/doc2-page1.png",
    width_px: 1000,
    height_px: 800,
    doc: "2",
  },
];

export const queryRoutingMockWords = [
  {
    id: 1,
    page: 101,
    page__page_number: 1,
    page__doc: "1",
    bbox: [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    content: "alpha word",
    direction: 1,
  },
  {
    id: 2,
    page: 201,
    page__page_number: 1,
    page__doc: "2",
    bbox: [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    content: "beta word",
    direction: 1,
  },
];

// idに関わらずsortの順番が機能することを確認するためのpage, wordMock

export const sortMockPages = [
  {
    id: 101,
    doc: "1",
    page_number: 1,
    image: "/sort-page-1.png",
    width_px: 1000,
    height_px: 800,
  },
];

// 想定:
// horizontalVsVerticalでh1が優先
// horizontalTopBottomでtopが優先
// horizontalLeftRightでleftが優先
// verticalRightLeftでvRightが優先
export const sortMockWords = {
  horizontalVsVertical: [
    {
      id: "z-h1",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [160, 100],
        [160, 130],
        [100, 130],
      ],
      content: "h1",
      direction: 1,
    },
    {
      id: "a-v1",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [80, 80],
        [110, 80],
        [110, 180],
        [80, 180],
      ],
      content: "v1",
      direction: 2,
    },
  ],

  horizontalTopBottom: [
    {
      id: "z-top",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [160, 100],
        [160, 130],
        [100, 130],
      ],
      content: "top",
      direction: 1,
    },
    {
      id: "a-bottom",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 200],
        [160, 200],
        [160, 230],
        [100, 230],
      ],
      content: "bottom",
      direction: 1,
    },
  ],

  horizontalLeftRight: [
    {
      id: "z-left",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [160, 100],
        [160, 130],
        [100, 130],
      ],
      content: "left",
      direction: 1,
    },
    {
      id: "a-right",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [200, 100],
        [260, 100],
        [260, 130],
        [200, 130],
      ],
      content: "right",
      direction: 1,
    },
  ],

  verticalRightLeft: [
    {
      id: "z-vRight",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [200, 100],
        [230, 100],
        [230, 220],
        [200, 220],
      ],
      content: "vRight",
      direction: 2,
    },
    {
      id: "a-vLeft",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [130, 100],
        [130, 220],
        [100, 220],
      ],
      content: "vLeft",
      direction: 2,
    },
  ],
};

// OCR preview fixture
// 1. 結果が空のケース
// 2. 結果が複数wordに分割されるケース
export const ocrMockByCase = {
  empty: {
    state: "SUCCESS",
    preview_id: "1",
    words: [],
    content: "",
  },
  splitWords: {
    state: "SUCCESS",
    preview_id: "1",
    words: [
      {
        bbox: [
          [110, 100],
          [150, 100],
          [150, 150],
          [110, 150],
        ],
        content: "分割A",
        direction: 1,
      },
      {
        bbox: [
          [150, 100],
          [200, 100],
          [200, 150],
          [150, 150],
        ],
        content: "分割B",
        direction: 1,
      },
    ],
  },
};

export const ocrJobMock = {
  previewJobId: "preview-job-1",
  result: ocrMockByCase.empty,
};

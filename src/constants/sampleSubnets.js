// Dữ liệu subnet mẫu, hư cấu (không lấy từ nguồn thứ ba) — dùng cho nút "Load
// sample data" để người xem mở app là dùng được ngay, không phải tự đi tìm JSON.
export const SAMPLE_SUBNETS = [
  {
    "netuid": 1,
    "name": "prompting",
    "price": 10.6663,
    "emission": 4.5122,
    "liquidity": 209706.77,
    "price_change_1_day": 11.78,
    "price_change_1_week": 12.93,
    "price_change_1_month": 56.93
  },
  {
    "netuid": 2,
    "name": "vision",
    "price": 37.8257,
    "emission": 0.6775,
    "liquidity": 444027.83,
    "price_change_1_day": 31.55,
    "price_change_1_week": -31.54,
    "price_change_1_month": -40.39
  },
  {
    "netuid": 3,
    "name": "audio-gen",
    "price": 22.738,
    "emission": 3.3491,
    "liquidity": 94259.65,
    "price_change_1_day": -14.47,
    "price_change_1_week": -26.98,
    "price_change_1_month": 16.28
  },
  {
    "netuid": 4,
    "name": "embedding",
    "price": 3.5997,
    "emission": 4.5127,
    "liquidity": 448586.64,
    "price_change_1_day": -8.64,
    "price_change_1_week": 51.69,
    "price_change_1_month": -26.61
  },
  {
    "netuid": 5,
    "name": "search",
    "price": 54.3308,
    "emission": 4.8794,
    "liquidity": 478699.14,
    "price_change_1_day": 12.97,
    "price_change_1_week": 59.73,
    "price_change_1_month": 72.17
  },
  {
    "netuid": 6,
    "name": "translate",
    "price": 27.522,
    "emission": 1.8901,
    "liquidity": 17893.31,
    "price_change_1_day": -1.21,
    "price_change_1_week": 10.14,
    "price_change_1_month": 20.91
  },
  {
    "netuid": 7,
    "name": "code-gen",
    "price": 7.8852,
    "emission": 2.1422,
    "liquidity": 201939.07,
    "price_change_1_day": -5.2,
    "price_change_1_week": 48.77,
    "price_change_1_month": -61.38
  },
  {
    "netuid": 8,
    "name": "image-diffusion",
    "price": 30.6103,
    "emission": 0.4264,
    "liquidity": 73426.56,
    "price_change_1_day": -6.57,
    "price_change_1_week": 32.8,
    "price_change_1_month": 105.76
  },
  {
    "netuid": 9,
    "name": "video-synth",
    "price": 1.6484,
    "emission": 2.3231,
    "liquidity": 193193.62,
    "price_change_1_day": -2.63,
    "price_change_1_week": -8.99,
    "price_change_1_month": 44.08
  },
  {
    "netuid": 10,
    "name": "graph-infer",
    "price": 19.2714,
    "emission": 3.4355,
    "liquidity": 205174.74,
    "price_change_1_day": 6.05,
    "price_change_1_week": 17.84,
    "price_change_1_month": -6.26
  },
  {
    "netuid": 11,
    "name": "reasoning",
    "price": 34.7457,
    "emission": 4.8003,
    "liquidity": 249972.45,
    "price_change_1_day": 21.17,
    "price_change_1_week": 56.94,
    "price_change_1_month": 78.85
  },
  {
    "netuid": 12,
    "name": "retrieval",
    "price": 17.9258,
    "emission": 1.2045,
    "liquidity": 22746.41,
    "price_change_1_day": 2.29,
    "price_change_1_week": 39.67,
    "price_change_1_month": 58.85
  },
  {
    "netuid": 13,
    "name": "music-gen",
    "price": 3.1875,
    "emission": 1.5516,
    "liquidity": 46671.42,
    "price_change_1_day": -20.29,
    "price_change_1_week": 16.51,
    "price_change_1_month": -29.97
  },
  {
    "netuid": 14,
    "name": "speech-to-text",
    "price": 36.5378,
    "emission": 3.7387,
    "liquidity": 513419.26,
    "price_change_1_day": 1.56,
    "price_change_1_week": 6.96,
    "price_change_1_month": -41.16
  },
  {
    "netuid": 15,
    "name": "text-to-speech",
    "price": 53.448,
    "emission": 4.808,
    "liquidity": 203100.11,
    "price_change_1_day": 17.57,
    "price_change_1_week": 29.68,
    "price_change_1_month": -41.29
  },
  {
    "netuid": 16,
    "name": "summarize",
    "price": 49.1962,
    "emission": 1.5017,
    "liquidity": 516192.13,
    "price_change_1_day": 11.2,
    "price_change_1_week": -13.96,
    "price_change_1_month": 90.31
  },
  {
    "netuid": 17,
    "name": "moderation",
    "price": 48.4298,
    "emission": 4.581,
    "liquidity": 149879.81,
    "price_change_1_day": -11.75,
    "price_change_1_week": 36.79,
    "price_change_1_month": -57.54
  },
  {
    "netuid": 18,
    "name": "classify",
    "price": 11.2143,
    "emission": 1.952,
    "liquidity": 172890.0,
    "price_change_1_day": 10.67,
    "price_change_1_week": -25.06,
    "price_change_1_month": 27.59
  },
  {
    "netuid": 19,
    "name": "forecast",
    "price": 38.0529,
    "emission": 3.4971,
    "liquidity": 210518.28,
    "price_change_1_day": -8.68,
    "price_change_1_week": 50.33,
    "price_change_1_month": -58.84
  },
  {
    "netuid": 20,
    "name": "recommend",
    "price": 20.3182,
    "emission": 1.5703,
    "liquidity": 478524.51,
    "price_change_1_day": 25.6,
    "price_change_1_week": -5.38,
    "price_change_1_month": 12.49
  },
  {
    "netuid": 21,
    "name": "compression",
    "price": 22.2949,
    "emission": 4.0477,
    "liquidity": 359483.22,
    "price_change_1_day": -4.0,
    "price_change_1_week": -1.61,
    "price_change_1_month": -10.54
  },
  {
    "netuid": 22,
    "name": "encoding",
    "price": 10.3737,
    "emission": 1.5082,
    "liquidity": 197066.31,
    "price_change_1_day": -4.48,
    "price_change_1_week": 61.88,
    "price_change_1_month": 63.69
  },
  {
    "netuid": 23,
    "name": "routing",
    "price": 48.5322,
    "emission": 1.0276,
    "liquidity": 402814.96,
    "price_change_1_day": 22.65,
    "price_change_1_week": -30.95,
    "price_change_1_month": -32.56
  },
  {
    "netuid": 24,
    "name": "indexing",
    "price": 40.6038,
    "emission": 2.2508,
    "liquidity": 53877.52,
    "price_change_1_day": 14.54,
    "price_change_1_week": -22.33,
    "price_change_1_month": 108.47
  },
  {
    "netuid": 25,
    "name": "caching",
    "price": 7.5599,
    "emission": 3.2108,
    "liquidity": 237846.79,
    "price_change_1_day": -10.96,
    "price_change_1_week": 41.38,
    "price_change_1_month": -36.46
  },
  {
    "netuid": 26,
    "name": "streaming",
    "price": 40.2907,
    "emission": 3.3937,
    "liquidity": 161062.18,
    "price_change_1_day": 6.32,
    "price_change_1_week": -32.53,
    "price_change_1_month": -35.1
  },
  {
    "netuid": 27,
    "name": "render",
    "price": 18.7492,
    "emission": 2.7607,
    "liquidity": 476729.3,
    "price_change_1_day": 15.51,
    "price_change_1_week": -17.28,
    "price_change_1_month": -12.23
  },
  {
    "netuid": 28,
    "name": "simulate",
    "price": 46.9605,
    "emission": 1.9322,
    "liquidity": 456340.33,
    "price_change_1_day": 0.61,
    "price_change_1_week": -44.5,
    "price_change_1_month": 27.36
  },
  {
    "netuid": 29,
    "name": "optimize",
    "price": 54.6341,
    "emission": 1.9746,
    "liquidity": 403369.04,
    "price_change_1_day": 13.79,
    "price_change_1_week": 45.91,
    "price_change_1_month": 72.2
  },
  {
    "netuid": 30,
    "name": "validate",
    "price": 11.5838,
    "emission": 3.9487,
    "liquidity": 167639.84,
    "price_change_1_day": 0.53,
    "price_change_1_week": 37.06,
    "price_change_1_month": 63.15
  },
  {
    "netuid": 31,
    "name": "cluster",
    "price": 23.7559,
    "emission": 1.1132,
    "liquidity": 232193.35,
    "price_change_1_day": 0.41,
    "price_change_1_week": 38.33,
    "price_change_1_month": 78.72
  },
  {
    "netuid": 32,
    "name": "rank",
    "price": 16.414,
    "emission": 4.0464,
    "liquidity": 128830.5,
    "price_change_1_day": 25.95,
    "price_change_1_week": -13.96,
    "price_change_1_month": -7.82
  },
  {
    "netuid": 33,
    "name": "score",
    "price": 10.0576,
    "emission": 4.0801,
    "liquidity": 426975.51,
    "price_change_1_day": 2.86,
    "price_change_1_week": -21.49,
    "price_change_1_month": -9.8
  },
  {
    "netuid": 34,
    "name": "extract",
    "price": 20.6796,
    "emission": 1.0776,
    "liquidity": 164312.91,
    "price_change_1_day": 16.31,
    "price_change_1_week": -25.13,
    "price_change_1_month": -61.26
  },
  {
    "netuid": 35,
    "name": "parse",
    "price": 24.0316,
    "emission": 4.6527,
    "liquidity": 128780.07,
    "price_change_1_day": -20.73,
    "price_change_1_week": 40.47,
    "price_change_1_month": -12.57
  },
  {
    "netuid": 36,
    "name": "align",
    "price": 29.6277,
    "emission": 4.9717,
    "liquidity": 156524.95,
    "price_change_1_day": -20.74,
    "price_change_1_week": 49.26,
    "price_change_1_month": -31.7
  },
  {
    "netuid": 37,
    "name": "distill",
    "price": 18.9368,
    "emission": 4.9581,
    "liquidity": 11399.45,
    "price_change_1_day": 4.13,
    "price_change_1_week": 15.13,
    "price_change_1_month": 72.66
  },
  {
    "netuid": 38,
    "name": "quantize",
    "price": 19.021,
    "emission": 2.1969,
    "liquidity": 155826.93,
    "price_change_1_day": 9.4,
    "price_change_1_week": 55.3,
    "price_change_1_month": 77.55
  },
  {
    "netuid": 39,
    "name": "prune",
    "price": 39.0198,
    "emission": 3.311,
    "liquidity": 280049.39,
    "price_change_1_day": -7.36,
    "price_change_1_week": -35.84,
    "price_change_1_month": 46.53
  },
  {
    "netuid": 40,
    "name": "ensemble",
    "price": 30.9947,
    "emission": 0.6406,
    "liquidity": 27336.47,
    "price_change_1_day": 6.06,
    "price_change_1_week": 1.42,
    "price_change_1_month": 93.7
  }
];

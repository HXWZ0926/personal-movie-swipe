import type { Movie } from "@/types/movie";

export const movies: Movie[] = [
  {
    id: "movie-spider-verse",
    title: "蜘蛛侠：纵横宇宙",
    originalTitle: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    type: "movie",
    rating: 8.4,
    popularity: 9.4,
    genres: ["动画", "科幻", "冒险"],
    posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    description: "迈尔斯卷入多元宇宙的新风暴，必须在命运、友情和自我选择之间做出决定。"
  },
  {
    id: "movie-oppenheimer",
    title: "奥本海默",
    originalTitle: "Oppenheimer",
    year: 2023,
    type: "movie",
    rating: 8.8,
    popularity: 9.2,
    genres: ["剧情", "传记", "历史"],
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    description: "一位科学家的天才、野心与时代洪流交织，改变世界的同时也改变了自己。"
  },
  {
    id: "movie-dune-2",
    title: "沙丘2",
    originalTitle: "Dune: Part Two",
    year: 2024,
    type: "movie",
    rating: 8.3,
    popularity: 9.6,
    genres: ["科幻", "冒险", "剧情"],
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    description: "保罗在沙漠星球上继续寻找自己的位置，复仇、预言与权力逐渐汇成命运。"
  },
  {
    id: "movie-everything",
    title: "瞬息全宇宙",
    originalTitle: "Everything Everywhere All at Once",
    year: 2022,
    type: "movie",
    rating: 8.5,
    popularity: 8.8,
    genres: ["科幻", "喜剧", "家庭"],
    posterUrl: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    description: "一个疲惫的母亲突然穿梭多元宇宙，在荒诞和亲情里重新理解人生。"
  },
  {
    id: "movie-parasite",
    title: "寄生虫",
    originalTitle: "Parasite",
    year: 2019,
    type: "movie",
    rating: 8.8,
    popularity: 8.9,
    genres: ["剧情", "悬疑", "犯罪"],
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    description: "两个家庭在阶层差异中彼此靠近，幽默、惊悚和悲剧逐步失控。"
  },
  {
    id: "movie-inception",
    title: "盗梦空间",
    originalTitle: "Inception",
    year: 2010,
    type: "movie",
    rating: 9.3,
    popularity: 9.1,
    genres: ["科幻", "悬疑", "动作"],
    posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    description: "造梦师潜入意识深处执行不可能的任务，现实与梦境的边界不断崩塌。"
  },
  {
    id: "movie-her",
    title: "她",
    originalTitle: "Her",
    year: 2013,
    type: "movie",
    rating: 8.4,
    popularity: 7.8,
    genres: ["爱情", "科幻", "剧情"],
    posterUrl: "https://image.tmdb.org/t/p/w500/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg",
    description: "孤独的写信人与人工智能系统相恋，一段温柔而刺痛的现代亲密关系。"
  },
  {
    id: "movie-coco",
    title: "寻梦环游记",
    originalTitle: "Coco",
    year: 2017,
    type: "movie",
    rating: 9.1,
    popularity: 8.5,
    genres: ["动画", "家庭", "音乐"],
    posterUrl: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
    description: "热爱音乐的少年误入亡灵世界，在歌声里找回家族记忆和爱的重量。"
  },
  {
    id: "movie-mad-max",
    title: "疯狂的麦克斯4：狂暴之路",
    originalTitle: "Mad Max: Fury Road",
    year: 2015,
    type: "movie",
    rating: 8.7,
    popularity: 8.7,
    genres: ["动作", "科幻", "冒险"],
    posterUrl: "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
    description: "废土上的极速逃亡与反抗，粗粝、猛烈，几乎每一秒都在燃烧。"
  },
  {
    id: "movie-before-sunrise",
    title: "爱在黎明破晓前",
    originalTitle: "Before Sunrise",
    year: 1995,
    type: "movie",
    rating: 8.8,
    popularity: 7.3,
    genres: ["爱情", "剧情"],
    posterUrl: "https://image.tmdb.org/t/p/w500/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg",
    description: "两个陌生人在维也纳共度一夜，用漫长谈话靠近彼此，也靠近青春。"
  },
  {
    id: "tv-breaking-bad",
    title: "绝命毒师",
    originalTitle: "Breaking Bad",
    year: 2008,
    type: "tv",
    rating: 9.7,
    popularity: 9.4,
    genres: ["犯罪", "剧情", "惊悚"],
    posterUrl: "https://image.tmdb.org/t/p/w500/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg",
    description: "一名化学老师走向制毒深渊，善恶、尊严和权力欲一点点改写人生。"
  },
  {
    id: "tv-better-call-saul",
    title: "风骚律师",
    originalTitle: "Better Call Saul",
    year: 2015,
    type: "tv",
    rating: 9.5,
    popularity: 8.8,
    genres: ["犯罪", "剧情"],
    posterUrl: "https://image.tmdb.org/t/p/w500/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg",
    description: "小律师吉米一步步成为索尔，人物弧光在细密日常里缓慢而精准地坠落。"
  },
  {
    id: "tv-dark",
    title: "暗黑",
    originalTitle: "Dark",
    year: 2017,
    type: "tv",
    rating: 9.0,
    popularity: 8.6,
    genres: ["科幻", "悬疑", "剧情"],
    posterUrl: "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    description: "德国小镇的失踪案牵出跨越世代的谜团，时间循环让每个家庭都无处可逃。"
  },
  {
    id: "tv-the-bear",
    title: "熊家餐馆",
    originalTitle: "The Bear",
    year: 2022,
    type: "tv",
    rating: 8.6,
    popularity: 8.4,
    genres: ["剧情", "喜剧"],
    posterUrl: "https://image.tmdb.org/t/p/w500/gqIU3U3g9YHRgYp8wG8XhMwfr9X.jpg",
    description: "年轻厨师回到家族小店，在厨房的高压、混乱和爱里试图重建生活。"
  },
  {
    id: "tv-friends",
    title: "老友记",
    originalTitle: "Friends",
    year: 1994,
    type: "tv",
    rating: 9.6,
    popularity: 8.9,
    genres: ["喜剧", "爱情"],
    posterUrl: "https://image.tmdb.org/t/p/w500/f496cm9enuEsZkSPzCwnTESEK5s.jpg",
    description: "六个朋友在纽约的公寓、咖啡馆和人生岔路口，留下经久不衰的陪伴感。"
  },
  {
    id: "tv-stranger-things",
    title: "怪奇物语",
    originalTitle: "Stranger Things",
    year: 2016,
    type: "tv",
    rating: 8.8,
    popularity: 9.5,
    genres: ["科幻", "悬疑", "冒险"],
    posterUrl: "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
    description: "小镇孩子、超自然实验和地下怪物共同构成复古又热血的冒险。"
  },
  {
    id: "tv-kingdom",
    title: "王国",
    originalTitle: "Kingdom",
    year: 2019,
    type: "tv",
    rating: 8.6,
    popularity: 8.1,
    genres: ["惊悚", "动作", "古装"],
    posterUrl: "https://image.tmdb.org/t/p/w500/AbxGx6fT3sMxYxKQEiJq71Vb0De.jpg",
    description: "朝鲜王朝宫廷阴谋撞上活尸灾难，权力斗争和生存恐惧同时爆发。"
  },
  {
    id: "tv-silicon-valley",
    title: "硅谷",
    originalTitle: "Silicon Valley",
    year: 2014,
    type: "tv",
    rating: 9.2,
    popularity: 7.9,
    genres: ["喜剧"],
    posterUrl: "https://image.tmdb.org/t/p/w500/dnN1ncxEOO1TY0gYL2FWxJqlhlL.jpg",
    description: "一群创业者在代码、资本和荒唐商业逻辑之间反复横跳，锋利又好笑。"
  },
  {
    id: "movie-chungking",
    title: "重庆森林",
    originalTitle: "Chungking Express",
    year: 1994,
    type: "movie",
    rating: 8.8,
    popularity: 7.6,
    genres: ["爱情", "剧情", "犯罪"],
    posterUrl: "https://image.tmdb.org/t/p/w500/43I9DcNoCzpyzK8JCkJYpHqHqGG.jpg",
    description: "失恋、罐头、加州梦和城市夜色，构成一部轻盈又孤独的香港爱情电影。"
  },
  {
    id: "movie-spirited-away",
    title: "千与千寻",
    originalTitle: "Spirited Away",
    year: 2001,
    type: "movie",
    rating: 9.4,
    popularity: 8.9,
    genres: ["动画", "奇幻", "冒险"],
    posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    description: "少女误入神灵世界，在奇幻旅程中学会勇气、善意和告别。"
  }
];

export const allGenres = Array.from(new Set(movies.flatMap((movie) => movie.genres))).sort(
  (a, b) => a.localeCompare(b, "zh-Hans-CN")
);

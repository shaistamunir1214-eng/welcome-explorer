export type Word = {
  id: string;
  imageUrl: string;
  audioUrl?: string;
  alt: string;
  phonetic: string;
  translations: { urdu: string; hindi: string; bengali: string; english: string };
};

export type WordCategory = {
  id: string;
  emoji: string;
  name: string;
  words: Word[];
};

const img = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=600&h=600&q=70`;

const ANIMALS: Word[] = [
  { id: "tiger", imageUrl: img("photo-1615963244664-5b845b2025ee"), alt: "Tiger walking in tall grass", phonetic: "[TY-ger]", translations: { urdu: "ببر", hindi: "बाघ", bengali: "বাঘ", english: "TIGER" } },
  { id: "elephant", imageUrl: img("photo-1557050543-4d5f4e07ef46"), alt: "Elephant standing in the wild", phonetic: "[EL-uh-fuhnt]", translations: { urdu: "ہاتھی", hindi: "हाथी", bengali: "হাতি", english: "ELEPHANT" } },
  { id: "cat", imageUrl: img("photo-1514888286974-6c03e2ca1dba"), alt: "Cat sitting and looking at the camera", phonetic: "[KAT]", translations: { urdu: "بلی", hindi: "बिल्ली", bengali: "বিড়াল", english: "CAT" } },
  { id: "dog", imageUrl: img("photo-1543466835-00a7907e9de1"), alt: "Happy dog with its tongue out", phonetic: "[DAWG]", translations: { urdu: "کتا", hindi: "कुत्ता", bengali: "কুকুর", english: "DOG" } },
  { id: "bird", imageUrl: img("photo-1444464666168-49d633b86797"), alt: "Small colourful bird on a branch", phonetic: "[BURD]", translations: { urdu: "پرندہ", hindi: "पक्षी", bengali: "পাখি", english: "BIRD" } },
  { id: "cow", imageUrl: img("photo-1500595046743-cd271d694d30"), alt: "Cow standing in a green field", phonetic: "[KOW]", translations: { urdu: "گائے", hindi: "गाय", bengali: "গরু", english: "COW" } },
  { id: "horse", imageUrl: img("photo-1553284965-83fd3e82fa5a"), alt: "Brown horse running in a meadow", phonetic: "[HORSS]", translations: { urdu: "گھوڑا", hindi: "घोड़ा", bengali: "ঘোড়া", english: "HORSE" } },
  { id: "monkey", imageUrl: img("photo-1540573133985-87b6da6d54a9"), alt: "Monkey sitting on a tree branch", phonetic: "[MUNG-kee]", translations: { urdu: "بندر", hindi: "बंदर", bengali: "বানর", english: "MONKEY" } },
  { id: "fish", imageUrl: img("photo-1524704654690-b56c05c78a00"), alt: "Orange fish swimming underwater", phonetic: "[FISH]", translations: { urdu: "مچھلی", hindi: "मछली", bengali: "মাছ", english: "FISH" } },
  { id: "lion", imageUrl: img("photo-1546182990-dffeafbe841d"), alt: "Lion resting in the sunshine", phonetic: "[LY-un]", translations: { urdu: "شیر", hindi: "शेर", bengali: "সিংহ", english: "LION" } },
];

const FRUITS: Word[] = [
  { id: "apple", imageUrl: img("photo-1560806887-1e4cd0b6cbd6"), alt: "Red apple on a wooden table", phonetic: "[A-pul]", translations: { urdu: "سیب", hindi: "सेब", bengali: "আপেল", english: "APPLE" } },
  { id: "banana", imageUrl: img("photo-1571771894821-ce9b6c11b08e"), alt: "Bunch of yellow bananas", phonetic: "[buh-NA-na]", translations: { urdu: "کیلا", hindi: "केला", bengali: "কলা", english: "BANANA" } },
  { id: "mango", imageUrl: img("photo-1553279768-865429fa0078"), alt: "Ripe mango cut in half", phonetic: "[MANG-go]", translations: { urdu: "آم", hindi: "आम", bengali: "আম", english: "MANGO" } },
  { id: "grapes", imageUrl: img("photo-1537640538966-79f369143f8f"), alt: "Bunch of purple grapes", phonetic: "[GRAYPS]", translations: { urdu: "انگور", hindi: "अंगूर", bengali: "আঙুর", english: "GRAPES" } },
  { id: "orange", imageUrl: img("photo-1547514701-42782101795e"), alt: "Orange fruit sliced open", phonetic: "[OR-inj]", translations: { urdu: "سنترہ", hindi: "संतरा", bengali: "কমলা", english: "ORANGE" } },
  { id: "watermelon", imageUrl: img("photo-1563114773-84221bd62daa"), alt: "Slices of watermelon", phonetic: "[WAW-ter-mel-un]", translations: { urdu: "تربوز", hindi: "तरबूज", bengali: "তরমুজ", english: "WATERMELON" } },
  { id: "strawberry", imageUrl: img("photo-1464965911861-746a04b4bca6"), alt: "Fresh red strawberries", phonetic: "[STRAW-beh-ree]", translations: { urdu: "اسٹرابیری", hindi: "स्ट्रॉबेरी", bengali: "স্ট্রবেরি", english: "STRAWBERRY" } },
  { id: "pineapple", imageUrl: img("photo-1550258987-190a2d41a8ba"), alt: "Whole pineapple with green leaves", phonetic: "[PY-na-pul]", translations: { urdu: "انناس", hindi: "अनानास", bengali: "আনারস", english: "PINEAPPLE" } },
  { id: "lemon", imageUrl: img("photo-1590502593747-42a996133562"), alt: "Yellow lemons in a pile", phonetic: "[LEH-mun]", translations: { urdu: "لیموں", hindi: "नींबू", bengali: "লেবু", english: "LEMON" } },
  { id: "pomegranate", imageUrl: img("photo-1541344999736-83eca272f6fc"), alt: "Pomegranate cut open showing seeds", phonetic: "[POM-uh-gran-it]", translations: { urdu: "انار", hindi: "अनार", bengali: "ডালিম", english: "POMEGRANATE" } },
];

export const WORD_CATEGORIES: Record<string, WordCategory> = {
  animals: { id: "animals", emoji: "🐾", name: "Animals", words: ANIMALS },
  fruits: { id: "fruits", emoji: "🍎", name: "Fruits", words: FRUITS },
};

export const lastWordKey = (categoryId: string) => `ww_last_word_${categoryId}`;

export interface SelectOption {
  value: string;
  label: string;
}

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' }
];

export const WHO_TO_MEET_OPTIONS: SelectOption[] = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: 'everyone', label: 'Everyone' }
];

export const INTENTION_OPTIONS: SelectOption[] = [
  { value: 'long_term', label: '❤️ Long-term relationship' },
  { value: 'marriage', label: '💍 Marriage' },
  { value: 'serious_dating', label: '😊 Serious dating' },
  { value: 'casual_dating', label: '💕 Casual dating' },
  { value: 'casual_fun', label: '🔥 Casual fun / hookups' },
  { value: 'friends_first', label: '🤝 Friends first' },
  { value: 'new_friends', label: '👥 New friends' },
  { value: 'travel_companion', label: '🌍 Travel companion' },
  { value: 'chatting', label: '💬 Chatting' },
  { value: 'open_to_anything', label: '💖 Open to anything' }
];

export const INTEREST_OPTIONS: SelectOption[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'music', label: 'Music' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'movies', label: 'Movies' },
  { value: 'reading', label: 'Reading' },
  { value: 'art', label: 'Art' },
  { value: 'photography', label: 'Photography' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'dancing', label: 'Dancing' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'wine', label: 'Wine' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'pets', label: 'Pets' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'sports', label: 'Sports' },
  { value: 'spirituality', label: 'Spirituality' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'tech', label: 'Tech' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'nature', label: 'Nature' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'faith', label: 'Faith' }
];

export const DRINKING_OPTIONS: SelectOption[] = [
  { value: 'never', label: 'Never' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'socially', label: 'Socially' },
  { value: 'regularly', label: 'Regularly' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

export const SMOKING_OPTIONS: SelectOption[] = [
  { value: 'never', label: 'Never' },
  { value: 'occasionally', label: 'Occasionally' },
  { value: 'regularly', label: 'Regularly' },
  { value: 'trying_to_quit', label: 'Trying to quit' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

export const EXERCISE_OPTIONS: SelectOption[] = [
  { value: 'never', label: 'Never' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
  { value: 'daily', label: 'Daily' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

export const CHILDREN_OPTIONS: SelectOption[] = [
  { value: 'have_and_want_more', label: 'Have kids, want more' },
  { value: 'have_and_dont_want_more', label: 'Have kids, done' },
  { value: 'want_someday', label: 'Want kids someday' },
  { value: 'dont_want', label: "Don't want kids" },
  { value: 'not_sure', label: 'Not sure yet' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' }
];

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
  { value: 'long_term', label: 'Long-term relationship' },
  { value: 'short_term', label: 'Short-term fun' },
  { value: 'casual', label: 'Casual dating' },
  { value: 'friendship', label: 'New friends' },
  { value: 'not_sure', label: 'Still figuring it out' }
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

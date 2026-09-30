/// Fixed choice lists for the onboarding pickers. Pure-Dart port of
/// apps/mobile/src/onboarding/options.ts; values are the exact strings the
/// API persists.
class SelectOption {
  const SelectOption({required this.value, required this.label});

  final String value;
  final String label;
}

const List<SelectOption> genderOptions = [
  SelectOption(value: 'woman', label: 'Woman'),
  SelectOption(value: 'man', label: 'Man'),
];

const List<SelectOption> whoToMeetOptions = [
  SelectOption(value: 'woman', label: 'Women'),
  SelectOption(value: 'man', label: 'Men'),
  SelectOption(value: 'everyone', label: 'Everyone'),
];

const List<SelectOption> intentionOptions = [
  SelectOption(value: 'long_term', label: '❤️ Long-term relationship'),
  SelectOption(value: 'marriage', label: '💍 Marriage'),
  SelectOption(value: 'serious_dating', label: '😊 Serious dating'),
  SelectOption(value: 'casual_dating', label: '💕 Casual dating'),
  SelectOption(value: 'casual_fun', label: '🔥 Hookups'),
  SelectOption(value: 'friends_first', label: '🤝 Friends first'),
  SelectOption(value: 'new_friends', label: '👥 New friends'),
  SelectOption(value: 'travel_companion', label: '🌍 Travel companion'),
  SelectOption(value: 'chatting', label: '💬 Chatting'),
  SelectOption(value: 'open_to_anything', label: '💖 Open to anything'),
];

const List<SelectOption> interestOptions = [
  SelectOption(value: 'travel', label: 'Travel'),
  SelectOption(value: 'music', label: 'Music'),
  SelectOption(value: 'fitness', label: 'Fitness'),
  SelectOption(value: 'cooking', label: 'Cooking'),
  SelectOption(value: 'movies', label: 'Movies'),
  SelectOption(value: 'reading', label: 'Reading'),
  SelectOption(value: 'art', label: 'Art'),
  SelectOption(value: 'photography', label: 'Photography'),
  SelectOption(value: 'gaming', label: 'Gaming'),
  SelectOption(value: 'hiking', label: 'Hiking'),
  SelectOption(value: 'yoga', label: 'Yoga'),
  SelectOption(value: 'dancing', label: 'Dancing'),
  SelectOption(value: 'coffee', label: 'Coffee'),
  SelectOption(value: 'wine', label: 'Wine'),
  SelectOption(value: 'foodie', label: 'Foodie'),
  SelectOption(value: 'pets', label: 'Pets'),
  SelectOption(value: 'fashion', label: 'Fashion'),
  SelectOption(value: 'sports', label: 'Sports'),
  SelectOption(value: 'spirituality', label: 'Spirituality'),
  SelectOption(value: 'volunteering', label: 'Volunteering'),
  SelectOption(value: 'tech', label: 'Tech'),
  SelectOption(value: 'comedy', label: 'Comedy'),
  SelectOption(value: 'nature', label: 'Nature'),
  SelectOption(value: 'nightlife', label: 'Nightlife'),
  SelectOption(value: 'faith', label: 'Faith'),
];

const List<SelectOption> drinkingOptions = [
  SelectOption(value: 'never', label: 'Never'),
  SelectOption(value: 'rarely', label: 'Rarely'),
  SelectOption(value: 'socially', label: 'Socially'),
  SelectOption(value: 'regularly', label: 'Regularly'),
  SelectOption(value: 'prefer_not_to_say', label: 'Prefer not to say'),
];

const List<SelectOption> smokingOptions = [
  SelectOption(value: 'never', label: 'Never'),
  SelectOption(value: 'occasionally', label: 'Occasionally'),
  SelectOption(value: 'regularly', label: 'Regularly'),
  SelectOption(value: 'trying_to_quit', label: 'Trying to quit'),
  SelectOption(value: 'prefer_not_to_say', label: 'Prefer not to say'),
];

const List<SelectOption> exerciseOptions = [
  SelectOption(value: 'never', label: 'Never'),
  SelectOption(value: 'sometimes', label: 'Sometimes'),
  SelectOption(value: 'often', label: 'Often'),
  SelectOption(value: 'daily', label: 'Daily'),
  SelectOption(value: 'prefer_not_to_say', label: 'Prefer not to say'),
];

const List<SelectOption> childrenOptions = [
  SelectOption(value: 'have_and_want_more', label: 'Have kids, want more'),
  SelectOption(value: 'have_and_dont_want_more', label: 'Have kids, done'),
  SelectOption(value: 'want_someday', label: 'Want kids someday'),
  SelectOption(value: 'dont_want', label: "Don't want kids"),
  SelectOption(value: 'not_sure', label: 'Not sure yet'),
  SelectOption(value: 'prefer_not_to_say', label: 'Prefer not to say'),
];

const List<SelectOption> languageOptions = [
  SelectOption(value: 'en', label: 'English'),
  SelectOption(value: 'sw', label: 'Swahili'),
  SelectOption(value: 'fr', label: 'French'),
  SelectOption(value: 'es', label: 'Spanish'),
  SelectOption(value: 'ar', label: 'Arabic'),
  SelectOption(value: 'pt', label: 'Portuguese'),
  SelectOption(value: 'de', label: 'German'),
  SelectOption(value: 'zh', label: 'Chinese'),
  SelectOption(value: 'hi', label: 'Hindi'),
  SelectOption(value: 'ru', label: 'Russian'),
];

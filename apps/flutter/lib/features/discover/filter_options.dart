// Filter option lists. Port of apps/mobile/src/onboarding/options.ts
// (only the lists used by filters/discovery). Pure Dart.
class FilterOption {
  const FilterOption(this.value, this.label);

  final String value;
  final String label;
}

const whoToMeetOptions = [
  FilterOption('woman', 'Women'),
  FilterOption('man', 'Men'),
  FilterOption('everyone', 'Everyone'),
];

const intentionOptions = [
  FilterOption('long_term', 'Long-term relationship'),
  FilterOption('marriage', 'Marriage'),
  FilterOption('serious_dating', 'Serious dating'),
  FilterOption('casual_dating', 'Casual dating'),
  FilterOption('casual_fun', 'Hookups'),
  FilterOption('friends_first', 'Friends first'),
  FilterOption('new_friends', 'New friends'),
  FilterOption('travel_companion', 'Travel companion'),
  FilterOption('chatting', 'Chatting'),
  FilterOption('open_to_anything', 'Open to anything'),
];

const interestOptions = [
  FilterOption('travel', 'Travel'),
  FilterOption('music', 'Music'),
  FilterOption('fitness', 'Fitness'),
  FilterOption('cooking', 'Cooking'),
  FilterOption('movies', 'Movies'),
  FilterOption('reading', 'Reading'),
  FilterOption('art', 'Art'),
  FilterOption('photography', 'Photography'),
  FilterOption('gaming', 'Gaming'),
  FilterOption('hiking', 'Hiking'),
  FilterOption('yoga', 'Yoga'),
  FilterOption('dancing', 'Dancing'),
  FilterOption('coffee', 'Coffee'),
  FilterOption('wine', 'Wine'),
  FilterOption('foodie', 'Foodie'),
  FilterOption('pets', 'Pets'),
  FilterOption('fashion', 'Fashion'),
  FilterOption('sports', 'Sports'),
  FilterOption('spirituality', 'Spirituality'),
  FilterOption('volunteering', 'Volunteering'),
  FilterOption('tech', 'Tech'),
  FilterOption('comedy', 'Comedy'),
  FilterOption('nature', 'Nature'),
  FilterOption('nightlife', 'Nightlife'),
  FilterOption('faith', 'Faith'),
];

const languageOptions = [
  FilterOption('en', 'English'),
  FilterOption('sw', 'Swahili'),
  FilterOption('fr', 'French'),
  FilterOption('es', 'Spanish'),
  FilterOption('ar', 'Arabic'),
  FilterOption('pt', 'Portuguese'),
  FilterOption('de', 'German'),
  FilterOption('zh', 'Chinese'),
  FilterOption('hi', 'Hindi'),
  FilterOption('ru', 'Russian'),
];

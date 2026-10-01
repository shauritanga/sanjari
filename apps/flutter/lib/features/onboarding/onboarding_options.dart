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

const List<SelectOption> educationOptions = [
  SelectOption(value: 'secondary_school', label: 'Secondary school'),
  SelectOption(value: 'non_degree', label: 'Non-degree qualification'),
  SelectOption(value: 'bachelors', label: "Bachelor's degree"),
  SelectOption(value: 'masters', label: "Master's degree"),
  SelectOption(value: 'doctorate', label: 'Doctorate'),
  SelectOption(value: 'other', label: 'Other education level'),
];

const List<SelectOption> maritalStatusOptions = [
  SelectOption(value: 'never_married', label: 'Never married'),
  SelectOption(value: 'divorced', label: 'Divorced'),
  SelectOption(value: 'separated', label: 'Separated'),
  SelectOption(value: 'annulled', label: 'Annulled'),
  SelectOption(value: 'widowed', label: 'Widowed'),
];

const List<SelectOption> ethnicityOptions = [
  SelectOption(value: 'african', label: 'African'),
  SelectOption(value: 'arab', label: 'Arab'),
  SelectOption(value: 'asian', label: 'Asian'),
  SelectOption(value: 'black', label: 'Black'),
  SelectOption(value: 'coloured', label: 'Coloured'),
  SelectOption(value: 'east_african', label: 'East African'),
  SelectOption(value: 'hispanic_latino', label: 'Hispanic / Latino'),
  SelectOption(value: 'indian', label: 'Indian'),
  SelectOption(value: 'mixed', label: 'Mixed'),
  SelectOption(value: 'north_african', label: 'North African'),
  SelectOption(value: 'southern_african', label: 'Southern African'),
  SelectOption(value: 'west_african', label: 'West African'),
  SelectOption(value: 'white', label: 'White'),
  SelectOption(value: 'other', label: 'Other'),
];

const List<SelectOption> professionOptions = [
  SelectOption(value: 'accountant', label: 'Accountant'),
  SelectOption(value: 'actor', label: 'Actor'),
  SelectOption(value: 'administration', label: 'Administration'),
  SelectOption(value: 'agriculture', label: 'Agriculture'),
  SelectOption(value: 'architect', label: 'Architect'),
  SelectOption(value: 'artist', label: 'Artist'),
  SelectOption(value: 'banking_finance', label: 'Banking & Finance'),
  SelectOption(value: 'business_owner', label: 'Business owner'),
  SelectOption(value: 'consultant', label: 'Consultant'),
  SelectOption(value: 'customer_service', label: 'Customer service'),
  SelectOption(value: 'doctor', label: 'Doctor'),
  SelectOption(value: 'engineer', label: 'Engineer'),
  SelectOption(value: 'entrepreneur', label: 'Entrepreneur'),
  SelectOption(value: 'government', label: 'Government'),
  SelectOption(value: 'healthcare', label: 'Healthcare'),
  SelectOption(value: 'hospitality', label: 'Hospitality'),
  SelectOption(value: 'journalist', label: 'Journalist'),
  SelectOption(value: 'lawyer', label: 'Lawyer'),
  SelectOption(value: 'marketing', label: 'Marketing'),
  SelectOption(value: 'nurse', label: 'Nurse'),
  SelectOption(value: 'pilot', label: 'Pilot'),
  SelectOption(value: 'real_estate', label: 'Real estate'),
  SelectOption(value: 'retail', label: 'Retail'),
  SelectOption(value: 'sales', label: 'Sales'),
  SelectOption(value: 'scientist', label: 'Scientist'),
  SelectOption(value: 'self_employed', label: 'Self-employed'),
  SelectOption(value: 'software_engineer', label: 'Software engineer'),
  SelectOption(value: 'student', label: 'Student'),
  SelectOption(value: 'teacher', label: 'Teacher'),
  SelectOption(value: 'trades', label: 'Trades (electrician, plumber, etc.)'),
  SelectOption(value: 'transport', label: 'Transport'),
  SelectOption(value: 'unemployed', label: 'Unemployed'),
  SelectOption(value: 'other', label: 'Other'),
];

const List<SelectOption> personalityOptions = [
  SelectOption(value: 'active_listener', label: 'Active listener'),
  SelectOption(value: 'adventurous', label: 'Adventurous'),
  SelectOption(value: 'affectionate', label: 'Affectionate'),
  SelectOption(value: 'ambitious', label: 'Ambitious'),
  SelectOption(value: 'calm', label: 'Calm'),
  SelectOption(value: 'cheerful', label: 'Cheerful'),
  SelectOption(value: 'confident', label: 'Confident'),
  SelectOption(value: 'creative', label: 'Creative'),
  SelectOption(value: 'easygoing', label: 'Easygoing'),
  SelectOption(value: 'empathetic', label: 'Empathetic'),
  SelectOption(value: 'extroverted', label: 'Extroverted'),
  SelectOption(value: 'family_oriented', label: 'Family-oriented'),
  SelectOption(value: 'funny', label: 'Funny'),
  SelectOption(value: 'generous', label: 'Generous'),
  SelectOption(value: 'honest', label: 'Honest'),
  SelectOption(value: 'introverted', label: 'Introverted'),
  SelectOption(value: 'loyal', label: 'Loyal'),
  SelectOption(value: 'optimistic', label: 'Optimistic'),
  SelectOption(value: 'organized', label: 'Organized'),
  SelectOption(value: 'outgoing', label: 'Outgoing'),
  SelectOption(value: 'patient', label: 'Patient'),
  SelectOption(value: 'romantic', label: 'Romantic'),
  SelectOption(value: 'spontaneous', label: 'Spontaneous'),
  SelectOption(value: 'thoughtful', label: 'Thoughtful'),
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

export const SECOND_HAND_CATEGORY_PATTERN = /^İkinci El/i;

export const CONDITION_QUERY_PARAM = 'durum';
export const SECOND_HAND_CONDITION = 'ikinci-el';

export const isSecondHandCategory = (category?: { diaCategory?: string; name?: string } | null): boolean => {
    if (!category) return false;
    return SECOND_HAND_CATEGORY_PATTERN.test(category.diaCategory || '') ||
        SECOND_HAND_CATEGORY_PATTERN.test(category.name || '');
};

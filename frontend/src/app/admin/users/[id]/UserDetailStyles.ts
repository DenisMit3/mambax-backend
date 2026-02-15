// Все стили для страницы детальной информации о пользователе
// Разбиты на секции для удобства поддержки

import { layoutStyles } from './styles/layoutStyles';
import { actionStyles } from './styles/actionStyles';
import { profileStyles } from './styles/profileStyles';
import { contentStyles } from './styles/contentStyles';

export const userDetailStyles = `
${layoutStyles}
${actionStyles}
${profileStyles}
${contentStyles}
`;

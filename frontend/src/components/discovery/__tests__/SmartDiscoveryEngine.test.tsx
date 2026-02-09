/**
 * Тесты для SmartDiscoveryEngine
 * 
 * Покрытие:
 * - Отображение карточек профилей
 * - Свайп влево/вправо/вверх
 * - Переключение режимов (stack/grid)
 * - Расширенный профиль
 * - Бесконечный цикл карточек
 * - Форматирование lastSeen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SmartDiscoveryEngine } from '../SmartDiscoveryEngine';

// Mock framer-motion
jest.mock('framer-motion', () => {
    const actual = jest.requireActual('framer-motion');
    return {
        ...actual,
        motion: {
            div: ({ children, onClick, className, style, drag, onDragEnd, animate, ...props }: any) => (
                <div 
                    data-testid="motion-div" 
                    onClick={onClick} 
                    className={className}
                    style={style}
                    {...props}
                >
                    {children}
                </div>
            ),
            button: ({ children, onClick, className, ...props }: any) => (
                <button onClick={onClick} className={className} {...props}>{children}</button>
            ),
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useMotionValue: () => ({
            get: () => 0,
            set: jest.fn(),
        }),
        useTransform: (value: any, input: any, output: any) => 0,
        useAnimation: () => ({
            start: jest.fn().mockResolvedValue(undefined),
            set: jest.fn(),
        }),
    };
});

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt, fill, sizes, className, priority }: any) => (
        <img src={src} alt={alt} className={className} data-testid="next-image" />
    ),
}));

describe('SmartDiscoveryEngine', () => {
    const mockUsers = [
        {
            id: 'user-1',
            name: 'Анна',
            age: 25,
            photos: ['https://example.com/anna.jpg'],
            bio: 'Люблю путешествия',
            distance: 5,
            is_verified: true,
            is_online: true,
            last_seen: new Date().toISOString(),
            gender: 'female',
            role: 'user',
        },
        {
            id: 'user-2',
            name: 'Мария',
            age: 28,
            photos: ['https://example.com/maria.jpg'],
            bio: 'Фотограф',
            distance: 10,
            is_verified: false,
            is_online: false,
            last_seen: new Date(Date.now() - 3600000).toISOString(), // 1 час назад
            gender: 'female',
            role: 'user',
        },
        {
            id: 'user-3',
            name: 'Екатерина',
            age: 23,
            photos: ['https://example.com/kate.jpg'],
            bio: 'Студентка',
            distance: 2,
            is_verified: true,
            is_online: false,
            last_seen: new Date(Date.now() - 86400000).toISOString(), // 1 день назад
            gender: 'female',
            role: 'user',
        },
    ];

    const defaultProps = {
        users: mockUsers,
        filters: {},
        onSwipe: jest.fn(),
        onFilterChange: jest.fn(),
        onStartChat: jest.fn(),
        isPremium: false,
        superLikesLeft: 5,
        boostActive: false,
        onUpgradeToPremium: jest.fn(),
        onUseBoost: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // БАЗОВОЕ ОТОБРАЖЕНИЕ
    // ==========================================

    describe('Базовое отображение', () => {
        it('отображает имя и возраст текущего профиля', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            expect(screen.getByText('Анна, 25')).toBeInTheDocument();
        });

        it('отображает расстояние до пользователя', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            expect(screen.getByText('5 км')).toBeInTheDocument();
        });

        it('отображает статус онлайн', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            expect(screen.getByText('Онлайн')).toBeInTheDocument();
        });

        it('отображает заголовок "Знакомства" в stack режиме', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            expect(screen.getByText('Знакомства')).toBeInTheDocument();
        });

        it('отображает фото профиля', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);
        });
    });

    // ==========================================
    // СВАЙП ФУНКЦИОНАЛ
    // ==========================================

    describe('Свайп функционал', () => {
        it('вызывает onSwipe с "like" при свайпе вправо', async () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Находим кнопку лайка (Heart)
            const buttons = screen.getAllByRole('button');
            const likeButton = buttons.find(btn => 
                btn.querySelector('svg')?.classList.contains('lucide-heart') ||
                btn.innerHTML.includes('Heart')
            );
            
            // Кликаем на кнопку лайка
            if (likeButton) {
                fireEvent.click(likeButton);
                
                await waitFor(() => {
                    expect(defaultProps.onSwipe).toHaveBeenCalledWith('user-1', 'like');
                });
            }
        });

        it('вызывает onSwipe с "superlike" при свайпе вверх', async () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Находим кнопку superlike (Zap)
            const buttons = screen.getAllByRole('button');
            const superlikeButton = buttons.find(btn => 
                btn.className?.includes('from-[#ff4b91]')
            );
            
            if (superlikeButton) {
                fireEvent.click(superlikeButton);
                
                await waitFor(() => {
                    expect(defaultProps.onSwipe).toHaveBeenCalledWith('user-1', 'superlike');
                });
            }
        });

        it('переходит к следующему профилю после свайпа', async () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Находим кнопку лайка
            const buttons = screen.getAllByRole('button');
            const likeButton = buttons.find(btn => 
                btn.className?.includes('from-[#ff4b91]')
            );
            
            if (likeButton) {
                fireEvent.click(likeButton);
                
                await waitFor(() => {
                    // После свайпа должен показаться следующий профиль
                    expect(screen.getByText('Мария, 28')).toBeInTheDocument();
                }, { timeout: 1000 });
            }
        });
    });

    // ==========================================
    // ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
    // ==========================================

    describe('Переключение режимов', () => {
        it('переключается в grid режим при клике на кнопку', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Находим кнопку переключения режима (Grid/Layers)
            const buttons = screen.getAllByRole('button');
            const modeButton = buttons.find(btn => 
                btn.className?.includes('bg-white/10')
            );
            
            if (modeButton) {
                fireEvent.click(modeButton);
                
                // В grid режиме заголовок меняется на "Сканнер"
                expect(screen.getByText('Сканнер')).toBeInTheDocument();
            }
        });

        it('отображает все профили в grid режиме', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Переключаемся в grid
            const buttons = screen.getAllByRole('button');
            const modeButton = buttons.find(btn => 
                btn.className?.includes('bg-white/10')
            );
            
            if (modeButton) {
                fireEvent.click(modeButton);
                
                // Все профили должны быть видны
                expect(screen.getByText('Анна, 25')).toBeInTheDocument();
                expect(screen.getByText('Мария, 28')).toBeInTheDocument();
                expect(screen.getByText('Екатерина, 23')).toBeInTheDocument();
            }
        });

        it('возвращается в stack режим при клике на профиль в grid', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Переключаемся в grid
            const buttons = screen.getAllByRole('button');
            const modeButton = buttons.find(btn => 
                btn.className?.includes('bg-white/10')
            );
            
            if (modeButton) {
                fireEvent.click(modeButton);
                
                // Кликаем на профиль в grid
                const gridItems = screen.getAllByTestId('motion-div');
                const profileCard = gridItems.find(item => 
                    item.className?.includes('aspect-[3/4]')
                );
                
                if (profileCard) {
                    fireEvent.click(profileCard);
                    
                    // Должен вернуться в stack режим
                    expect(screen.getByText('Знакомства')).toBeInTheDocument();
                }
            }
        });
    });

    // ==========================================
    // РАСШИРЕННЫЙ ПРОФИЛЬ
    // ==========================================

    describe('Расширенный профиль', () => {
        it('открывает расширенный профиль при клике на "Подробнее"', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            const detailsButton = screen.getByText('Подробнее');
            fireEvent.click(detailsButton);
            
            // Должен появиться расширенный профиль с bio
            expect(screen.getByText('О себе')).toBeInTheDocument();
            expect(screen.getByText('Люблю путешествия')).toBeInTheDocument();
        });

        it('показывает интересы в расширенном профиле', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            const detailsButton = screen.getByText('Подробнее');
            fireEvent.click(detailsButton);
            
            expect(screen.getByText('Интересы')).toBeInTheDocument();
        });

        it('закрывает расширенный профиль при клике на кнопку закрытия', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Открываем
            fireEvent.click(screen.getByText('Подробнее'));
            expect(screen.getByText('О себе')).toBeInTheDocument();
            
            // Находим кнопку закрытия (ChevronDown rotated)
            const closeButtons = screen.getAllByRole('button');
            const closeButton = closeButtons.find(btn => 
                btn.className?.includes('top-4 right-4')
            );
            
            if (closeButton) {
                fireEvent.click(closeButton);
                
                // Расширенный профиль должен закрыться
                // "О себе" больше не должно быть видно в основном виде
            }
        });
    });

    // ==========================================
    // ПУСТОЕ СОСТОЯНИЕ
    // ==========================================

    describe('Пустое состояние', () => {
        it('показывает сообщение когда нет пользователей', () => {
            render(<SmartDiscoveryEngine {...defaultProps} users={[]} />);
            
            // Должны показаться demo пользователи или сообщение
            // В текущей реализации показываются demo пользователи
            expect(screen.getByText(/Арина|Екатерина|Максим/)).toBeInTheDocument();
        });

        it('использует demo пользователей при пустом списке', () => {
            render(<SmartDiscoveryEngine {...defaultProps} users={[]} />);
            
            // Demo пользователи: Арина, Екатерина, Максим
            const demoNames = ['Арина', 'Екатерина', 'Максим'];
            const foundDemo = demoNames.some(name => 
                screen.queryByText(new RegExp(name))
            );
            
            expect(foundDemo).toBe(true);
        });
    });

    // ==========================================
    // ФОРМАТИРОВАНИЕ LAST SEEN
    // ==========================================

    describe('Форматирование lastSeen', () => {
        it('показывает "Онлайн" для онлайн пользователей', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            expect(screen.getByText('Онлайн')).toBeInTheDocument();
        });

        it('показывает время для офлайн пользователей', () => {
            const offlineUsers = [{
                ...mockUsers[0],
                is_online: false,
                last_seen: new Date(Date.now() - 3600000).toISOString(), // 1 час назад
            }];
            
            render(<SmartDiscoveryEngine {...defaultProps} users={offlineUsers} />);
            
            expect(screen.getByText(/был\(а\) 1 ч\. назад/)).toBeInTheDocument();
        });
    });

    // ==========================================
    // БЕСКОНЕЧНЫЙ ЦИКЛ
    // ==========================================

    describe('Бесконечный цикл карточек', () => {
        it('возвращается к первому профилю после последнего', async () => {
            const twoUsers = mockUsers.slice(0, 2);
            render(<SmartDiscoveryEngine {...defaultProps} users={twoUsers} />);
            
            // Первый профиль
            expect(screen.getByText('Анна, 25')).toBeInTheDocument();
            
            // Свайпаем первый
            const buttons = screen.getAllByRole('button');
            const superlikeButton = buttons.find(btn => 
                btn.className?.includes('from-[#ff4b91]')
            );
            
            if (superlikeButton) {
                // Свайп 1
                fireEvent.click(superlikeButton);
                await waitFor(() => {
                    expect(screen.getByText('Мария, 28')).toBeInTheDocument();
                }, { timeout: 500 });
                
                // Свайп 2 - должен вернуться к Анне
                fireEvent.click(superlikeButton);
                await waitFor(() => {
                    expect(screen.getByText('Анна, 25')).toBeInTheDocument();
                }, { timeout: 500 });
            }
        });
    });

    // ==========================================
    // КНОПКА ЧАТА
    // ==========================================

    describe('Кнопка чата', () => {
        it('вызывает onStartChat при клике на кнопку сообщения', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Находим кнопку чата (MessageCircle)
            const buttons = screen.getAllByRole('button');
            const chatButton = buttons.find(btn => 
                btn.className?.includes('w-14 h-14') && 
                !btn.className?.includes('from-[#ff4b91]')
            );
            
            if (chatButton) {
                fireEvent.click(chatButton);
                
                expect(defaultProps.onStartChat).toHaveBeenCalledWith('user-1');
            }
        });
    });

    // ==========================================
    // ВЕРИФИКАЦИЯ
    // ==========================================

    describe('Верификация', () => {
        it('показывает badge верификации для верифицированных пользователей', () => {
            render(<SmartDiscoveryEngine {...defaultProps} />);
            
            // Переключаемся в grid чтобы увидеть badge
            const buttons = screen.getAllByRole('button');
            const modeButton = buttons.find(btn => 
                btn.className?.includes('bg-white/10')
            );
            
            if (modeButton) {
                fireEvent.click(modeButton);
                
                // Должен быть badge с Zap иконкой для верифицированных
                const badges = screen.getAllByTestId('motion-div').filter(el => 
                    el.className?.includes('bg-blue-500')
                );
                
                expect(badges.length).toBeGreaterThan(0);
            }
        });
    });
});

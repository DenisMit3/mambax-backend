import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { SwipeCard } from '../SwipeCard';

describe('SwipeCard', () => {
    const mockSwipe = jest.fn();
    const mockGift = jest.fn();
    const mockProfile = jest.fn();

    const defaultProps = {
        name: 'Alice',
        age: 25,
        bio: 'Hello world',
        image: '/img.jpg',
        onSwipe: mockSwipe,
        onGiftClick: mockGift,
        onProfileClick: mockProfile
    };

    it('renders correctly', () => {
        render(<SwipeCard {...defaultProps} />);
        expect(screen.getByText('Alice, 25')).toBeInTheDocument();
        expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('handles gift click', () => {
        render(<SwipeCard {...defaultProps} />);
        const giftBtn = screen.getByRole('button');
        fireEvent.click(giftBtn);
        expect(mockGift).toHaveBeenCalled();
    });

    it('handles profile click', () => {
        render(<SwipeCard {...defaultProps} />);
        const infoDiv = screen.getByText('Hello world').closest('div');
        fireEvent.click(infoDiv!.parentElement!);
        // Note: The onClick is on the container div of info. 
        // We can click the text 'Alice, 25' as it's inside that div.
        fireEvent.click(screen.getByText('Alice, 25'));
        expect(mockProfile).toHaveBeenCalled();
    });
});

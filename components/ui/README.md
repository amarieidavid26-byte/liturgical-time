# UI Components

Reusable UI components for the Orthodox Business Calendar app.

## Card Component

A flexible card component with support for standard cards, gradient cards, and touchable cards.

### Import

```tsx
import { Card } from '@/components/ui';
```

### Basic Usage

#### Standard Card
```tsx
<Card>
  <Text>Your content here</Text>
</Card>
```

#### Touchable Card
```tsx
<Card onPress={() => console.log('Card tapped!')}>
  <Text>Tap me!</Text>
</Card>
```

#### Gradient Card
```tsx
import Colors from '@/constants/Colors';

<Card 
  gradient={true} 
  colors={Colors.orthodox.goldGradient}
  onPress={() => console.log('Gradient card tapped!')}
>
  <Text style={{ color: 'white' }}>Beautiful gradient!</Text>
</Card>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to display inside the card |
| `onPress` | `() => void` | `undefined` | Makes card touchable if provided |
| `gradient` | `boolean` | `false` | Enables gradient background |
| `colors` | `readonly [string, string, ...string[]]` | `['#FFFFFF', '#FFFFFF']` | Gradient colors (requires at least 2 colors) |

### Examples with Orthodox Colors

#### Gold Gradient Card
```tsx
<Card gradient colors={Colors.orthodox.goldGradient}>
  <Text style={{ color: 'white', fontWeight: 'bold' }}>
    Great Feast
  </Text>
</Card>
```

#### Royal Blue Gradient Card
```tsx
<Card gradient colors={Colors.orthodox.royalBlueGradient}>
  <Text style={{ color: 'white' }}>
    Divine Liturgy
  </Text>
</Card>
```

#### Burgundy Gradient Card
```tsx
<Card gradient colors={Colors.orthodox.burgundyGradient}>
  <Text style={{ color: 'white' }}>
    Fasting Period
  </Text>
</Card>
```

### Features

- **Consistent Styling**: 16px border radius, 16px padding
- **Built-in Shadows**: Medium shadow preset from Colors.shadows.medium
- **Touch Feedback**: Active opacity of 0.95 for standard cards, 0.9 for gradient cards
- **Type Safety**: Full TypeScript support with proper prop types
- **Flexible**: Works as a container or interactive element

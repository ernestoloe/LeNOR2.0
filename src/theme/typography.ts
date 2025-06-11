import { TextStyle } from 'react-native';

type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

interface TypographyStyles {
  fontFamily: {
    primary: string;
    secondary: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  fontWeight: {
    light: FontWeight;
    regular: FontWeight;
    medium: FontWeight;
    semibold: FontWeight;
    bold: FontWeight;
  };
  lineHeight: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  styles: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    h4: TextStyle;
    body1: TextStyle;
    body2: TextStyle;
    button: TextStyle;
    caption: TextStyle;
    overline: TextStyle;
  };
}

export const typography: TypographyStyles = {
  fontFamily: {
    primary: 'Roboto-Regular',
    secondary: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
  },
  styles: {
    h1: {
      fontFamily: 'Roboto-Bold',
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontFamily: 'Roboto-Bold',
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    h3: {
      fontFamily: 'Roboto-Medium',
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h4: {
      fontFamily: 'Roboto-Medium',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    body1: {
      fontFamily: 'Roboto-Regular',
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    body2: {
      fontFamily: 'Roboto-Regular',
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    button: {
      fontFamily: 'Roboto-Medium',
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'Roboto-Regular',
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    overline: {
      fontFamily: 'Roboto-Medium',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  },
};

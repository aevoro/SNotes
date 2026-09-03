import { Link } from 'expo-router';
import { type ComponentProps } from 'react';
import { Platform, Linking } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          Linking.openURL(href);
        }
      }}
    />
  );
}

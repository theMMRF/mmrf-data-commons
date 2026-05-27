import React from 'react';
import { Box, Text } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import type { TermsVersion } from '@/lib/terms/types';

interface TermsContentProps {
  terms: TermsVersion;
}

const TermsContent = ({ terms }: TermsContentProps) => {
  if (terms.contentFormat === 'html') {
    return (
      <Box
        className="terms-content"
        dangerouslySetInnerHTML={{ __html: terms.termsContent }}
        mah={400}
        style={{ overflowY: 'auto' }}
      />
    );
  }

  if (terms.contentFormat === 'markdown') {
    return (
      <Box className="terms-content" mah={400} style={{ overflowY: 'auto' }}>
        <ReactMarkdown>{terms.termsContent}</ReactMarkdown>
      </Box>
    );
  }

  return (
    <Text
      component="div"
      mah={400}
      style={{ overflowY: 'auto', whiteSpace: 'pre-wrap' }}
    >
      {terms.termsContent}
    </Text>
  );
};

export default TermsContent;

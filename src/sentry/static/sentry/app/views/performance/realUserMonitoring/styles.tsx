import styled from '@emotion/styled';

import {SectionHeading} from 'app/components/charts/styles';
import {PanelItem} from 'app/components/panels';
import space from 'app/styles/space';
import {getDuration} from 'app/utils/formatters';

export const Card = styled(PanelItem)`
  flex-grow: 1;
  padding: 0;

  @media (min-width: ${p => p.theme.breakpoints[1]}) {
    display: grid;
    grid-template-columns: auto 66%;
    align-content: start;
  }

  @media (min-width: ${p => p.theme.breakpoints[2]}) {
    grid-template-columns: 325px minmax(100px, auto);
  }
`;

export const CardSection = styled('div')`
  padding: ${space(3)};
`;

export const CardSummary = styled(CardSection)`
  border-right: 1px solid ${p => p.theme.borderLight};
  grid-column: 1/1;
`;

export const CardSectionHeading = styled(SectionHeading)`
  margin: 0px;
`;

export const StatNumber = styled('div')`
  font-size: 36px;
  margin: ${space(2)} 0px;
  color: ${p => p.theme.gray700};
`;

export const Description = styled('p')`
  font-size: 14px;
  margin: ${space(1)} 0px;
`;

export function formatDuration(duration: number): string {
  return duration < 1000
    ? getDuration(duration / 1000, 0, true)
    : getDuration(duration / 1000, 2, true);
}

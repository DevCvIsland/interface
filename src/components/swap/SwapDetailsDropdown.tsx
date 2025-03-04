import { Trans } from '@lingui/macro'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { ElementName, Event, EventName } from 'components/AmplitudeAnalytics/constants'
import { Trace } from 'components/AmplitudeAnalytics/Trace'
import { TraceEvent } from 'components/AmplitudeAnalytics/TraceEvent'
import { formatPercentInBasisPointsNumber, getNumberFormattedToDecimalPlace } from 'components/AmplitudeAnalytics/utils'
import AnimatedDropdown from 'components/AnimatedDropdown'
import Card, { OutlineCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import { LoadingOpacityContainer } from 'components/Loader/styled'
import Row, { RowBetween, RowFixed } from 'components/Row'
import { MouseoverTooltipContent } from 'components/Tooltip'
import { SUPPORTED_GAS_ESTIMATE_CHAIN_IDS } from 'constants/chains'
import { darken } from 'polished'
import { useEffect, useState } from 'react'
import { ChevronDown, Info } from 'react-feather'
import { InterfaceTrade } from 'state/routing/types'
import styled, { keyframes, useTheme } from 'styled-components/macro'
import { HideSmall, ThemedText } from 'theme'
import { computeRealizedLPFeePercent } from 'utils/prices'

import { AdvancedSwapDetails } from './AdvancedSwapDetails'
import { getPriceImpactPercent } from './AdvancedSwapDetails'
import GasEstimateBadge from './GasEstimateBadge'
import { ResponsiveTooltipContainer } from './styleds'
import SwapRoute from './SwapRoute'
import TradePrice from './TradePrice'

const Wrapper = styled(Row)`
  width: 100%;
  justify-content: center;
`

const StyledInfoIcon = styled(Info)`
  height: 16px;
  width: 16px;
  margin-right: 4px;
  color: ${({ theme }) => theme.deprecated_text3};
`

const StyledCard = styled(OutlineCard)`
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.deprecated_bg2};
`

const StyledHeaderRow = styled(RowBetween)<{ disabled: boolean; open: boolean }>`
  padding: 4px 8px;
  border-radius: 12px;
  background-color: ${({ open, theme }) => (open ? theme.deprecated_bg1 : 'transparent')};
  align-items: center;
  cursor: ${({ disabled }) => (disabled ? 'initial' : 'pointer')};
  min-height: 40px;

  :hover {
    background-color: ${({ theme, disabled }) =>
      disabled ? theme.deprecated_bg1 : darken(0.015, theme.deprecated_bg1)};
  }
`

const RotatingArrow = styled(ChevronDown)<{ open?: boolean }>`
  transform: ${({ open }) => (open ? 'rotate(180deg)' : 'none')};
  transition: transform 0.1s linear;
`

const StyledPolling = styled.div`
  display: flex;
  height: 16px;
  width: 16px;
  margin-right: 2px;
  margin-left: 10px;
  align-items: center;
  color: ${({ theme }) => theme.deprecated_text1};
  transition: 250ms ease color;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none;
  `}
`

const StyledPollingDot = styled.div`
  width: 8px;
  height: 8px;
  min-height: 8px;
  min-width: 8px;
  border-radius: 50%;
  position: relative;
  background-color: ${({ theme }) => theme.deprecated_bg2};
  transition: 250ms ease background-color;
`

const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const Spinner = styled.div`
  animation: ${rotate360} 1s cubic-bezier(0.83, 0, 0.17, 1) infinite;
  transform: translateZ(0);
  border-top: 1px solid transparent;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  border-left: 2px solid ${({ theme }) => theme.deprecated_text1};
  background: transparent;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  position: relative;
  transition: 250ms ease border-color;
  left: -3px;
  top: -3px;
`

interface SwapDetailsInlineProps {
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
  syncing: boolean
  loading: boolean
  showInverted: boolean
  setShowInverted: React.Dispatch<React.SetStateAction<boolean>>
  allowedSlippage: Percent
}

const formatAnalyticsEventProperties = (trade: InterfaceTrade<Currency, Currency, TradeType>) => {
  const lpFeePercent = trade ? computeRealizedLPFeePercent(trade) : undefined
  return {
    token_in_symbol: trade.inputAmount.currency.symbol,
    token_out_symbol: trade.outputAmount.currency.symbol,
    token_in_address: trade.inputAmount.currency.isToken ? trade.inputAmount.currency.address : undefined,
    token_out_address: trade.outputAmount.currency.isToken ? trade.outputAmount.currency.address : undefined,
    price_impact_basis_points: lpFeePercent
      ? formatPercentInBasisPointsNumber(getPriceImpactPercent(lpFeePercent, trade))
      : undefined,
    estimated_network_fee_usd: trade.gasUseEstimateUSD
      ? getNumberFormattedToDecimalPlace(trade.gasUseEstimateUSD, 2)
      : undefined,
    chain_id:
      trade.inputAmount.currency.chainId === trade.outputAmount.currency.chainId
        ? trade.inputAmount.currency.chainId
        : undefined,
    token_in_amount: getNumberFormattedToDecimalPlace(trade.inputAmount, trade.inputAmount.currency.decimals),
    token_out_amount: getNumberFormattedToDecimalPlace(trade.outputAmount, trade.outputAmount.currency.decimals),
    // TODO(lynnshaoyu): Implement quote_latency_milliseconds.
  }
}

export default function SwapDetailsDropdown({
  trade,
  syncing,
  loading,
  showInverted,
  setShowInverted,
  allowedSlippage,
}: SwapDetailsInlineProps) {
  const theme = useTheme()
  const { chainId } = useWeb3React()
  const [showDetails, setShowDetails] = useState(false)
  const [isFirstPriceFetch, setIsFirstPriceFetch] = useState(true)

  useEffect(() => {
    if (isFirstPriceFetch && syncing) setIsFirstPriceFetch(false)
  }, [isFirstPriceFetch, syncing])

  return (
    <Wrapper>
      <AutoColumn gap={'8px'} style={{ width: '100%', marginBottom: '-8px' }}>
        <TraceEvent
          events={[Event.onClick]}
          name={EventName.SWAP_DETAILS_EXPANDED}
          element={ElementName.SWAP_DETAILS_DROPDOWN}
          shouldLogImpression={!showDetails}
        >
          <StyledHeaderRow onClick={() => setShowDetails(!showDetails)} disabled={!trade} open={showDetails}>
            <RowFixed style={{ position: 'relative' }}>
              {loading || syncing ? (
                <StyledPolling>
                  <StyledPollingDot>
                    <Spinner />
                  </StyledPollingDot>
                </StyledPolling>
              ) : (
                <HideSmall>
                  <MouseoverTooltipContent
                    wrap={false}
                    content={
                      <ResponsiveTooltipContainer origin="top right" style={{ padding: '0' }}>
                        <Card padding="12px">
                          <AdvancedSwapDetails
                            trade={trade}
                            allowedSlippage={allowedSlippage}
                            syncing={syncing}
                            hideInfoTooltips={true}
                          />
                        </Card>
                      </ResponsiveTooltipContainer>
                    }
                    placement="bottom"
                    disableHover={showDetails}
                  >
                    <StyledInfoIcon color={trade ? theme.deprecated_text3 : theme.deprecated_bg3} />
                  </MouseoverTooltipContent>
                </HideSmall>
              )}
              {trade ? (
                <LoadingOpacityContainer $loading={syncing}>
                  <Trace
                    name={EventName.SWAP_QUOTE_RECEIVED}
                    element={ElementName.SWAP_TRADE_PRICE_ROW}
                    properties={formatAnalyticsEventProperties(trade)}
                    shouldLogImpression={!loading && !syncing && isFirstPriceFetch}
                  >
                    <TradePrice
                      price={trade.executionPrice}
                      showInverted={showInverted}
                      setShowInverted={setShowInverted}
                    />
                  </Trace>
                </LoadingOpacityContainer>
              ) : loading || syncing ? (
                <ThemedText.Main fontSize={14}>
                  <Trans>Fetching best price...</Trans>
                </ThemedText.Main>
              ) : null}
            </RowFixed>
            <RowFixed>
              {!trade?.gasUseEstimateUSD ||
              showDetails ||
              !chainId ||
              !SUPPORTED_GAS_ESTIMATE_CHAIN_IDS.includes(chainId) ? null : (
                <GasEstimateBadge
                  trade={trade}
                  loading={syncing || loading}
                  showRoute={!showDetails}
                  disableHover={showDetails}
                />
              )}
              <RotatingArrow
                stroke={trade ? theme.deprecated_text3 : theme.deprecated_bg3}
                open={Boolean(trade && showDetails)}
              />
            </RowFixed>
          </StyledHeaderRow>
        </TraceEvent>
        <AnimatedDropdown open={showDetails}>
          <AutoColumn gap={'8px'} style={{ padding: '0', paddingBottom: '8px' }}>
            {trade ? (
              <StyledCard>
                <AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} syncing={syncing} />
              </StyledCard>
            ) : null}
            {trade ? <SwapRoute trade={trade} syncing={syncing} /> : null}
          </AutoColumn>
        </AnimatedDropdown>
      </AutoColumn>
    </Wrapper>
  )
}

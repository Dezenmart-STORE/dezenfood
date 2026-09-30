// const CONFIRM_ONRAMP_URL = "/on_ramp_transactions/{merchantRef}/confirm";
export const GET_CONFIRM_ONRAMP_URL = (merchantRef: string) => `/on_ramp/${merchantRef}/confirm`;  // qudex `/on_ramp_transactions/${merchantRef}/confirm`
export const GET_CONFIRM_OFFRAMP_URL = (merchantRef: string) => `/off_ramp/${merchantRef}/confirm`;// qudex `/off_ramp_transactions/${merchantRef}/confirm`
export const INITIATE_ONRAMP_URL = "/on-ramp/initiate"; // quidex /on_ramp_transactions/initiate
export const INITIATE_OFFRAMP_URL = "/off-ramp/initiate"; //quidex /off_ramp_transactions/initiate
export const GET_REFRESH_ONRAMP_URL = (merchantRef: string) => `/on_ramp/${merchantRef}/refresh`; //quidex /on_ramp_transactions/{merchantRef}/refresh
export const GET_REFRESH_OFFRAMP_URL = (merchantRef: string) => `/off_ramp/${merchantRef}/refresh`; //quidex /off_ramp_transactions/{merchantRef}/refresh

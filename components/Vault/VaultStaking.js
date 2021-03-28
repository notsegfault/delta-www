/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import { useWallet } from 'use-wallet';
import { ModalContext } from '../../contexts';
import { GlobalHooksContext } from '../../contexts/GlobalHooks';
import { formatting, transactions } from '../../helpers';
import DeltaButton from '../Button/DeltaButton';
import TransactionButton from '../Button/TransactionButton';
import { CompoundBurnCheckbox } from '../CheckBox';
import { DeltaPanel } from '../Section'
import { DATA_UNAVAILABLE, deltaUniswapUrl } from '../../config';
import { useRlpRouter, useYam } from '../../hooks';
import { TokenInput } from '../Input';

const RlpStaking = () => {
  const globalHooks = useContext(GlobalHooksContext);
  const modalContext = useContext(ModalContext);
  const yam = useYam();
  const wallet = useWallet();

  // eslint-disable-next-line consistent-return
  const onStake = async (amount, amountBN) => {
    const confirmed = await modalContext.showConfirm('Staking', `Are you sure you wanna stake ${amount} rLP ?`);

    if (confirmed) {
      const transaction = yam.contracts.dfv.methods.deposit(amountBN.toString(), 0);

      await transactions.executeTransaction(
        modalContext,
        transaction,
        { from: wallet.account },
        "Successfully staked",
        "Stake",
        "Error while staking"
      );

      globalHooks.staking.update();
      globalHooks.rlpInfo.update();

      return true;
    }
  };

  const allowanceRequiredFor = {
    contract: 'dfv',
    token: 'rLP'
  };

  return <div>
    <TokenInput className="mt-4" token="rLP" buttonText="Stake" buttonTextLoading="Staking..." onOk={onStake} allowanceRequiredFor={allowanceRequiredFor} />
  </div >
};

const DeltaStaking = () => {
  const globalHooks = useContext(GlobalHooksContext);
  const modalContext = useContext(ModalContext);
  const yam = useYam();
  const wallet = useWallet();

  // eslint-disable-next-line consistent-return
  const onStake = async (amount, amountBN, valid, burning) => {
    if (!valid) {
      await modalContext.showError('Error', 'Invalid input');
    } else {

      const message = burning ? `You are about to stake ${amount} DELTA in the Deep Farming Vault. ${(amount / 2).toLocaleString()} DELTA will be locked permanently in the DFV.` : `You are about to stake ${amount} Delta in the Deep Farming Vault without a "Burn Deposit". This will reduce your Multiplier from ${globalHooks.staking.info.booster}x to 1x. To prevent this please check the box Burn Deposit.`;
      const confirmed = await modalContext.showConfirm('Staking', message);

      if (confirmed) {
        const transaction = burning ? yam.contracts.dfv.methods.depositWithBurn(amountBN.toString()) : yam.contracts.dfv.methods.deposit(0, amountBN.toString());

        await transactions.executeTransaction(
          modalContext,
          transaction,
          { from: wallet.account },
          "Successfully staked",
          "Stake",
          "Error while staking"
        );

        globalHooks.staking.update();
        globalHooks.delta.update();

        return true;
      }
    }
  };

  // eslint-disable-next-line consistent-return
  const onCompoundDeposit = async () => {
    const userInfo = await yam.contracts.dfv.methods.userInfo(wallet.account).call();
    const { compoundBurn } = userInfo;

    const amount = formatting.getTokenAmount(globalHooks.staking.info.farmedDelta, 18, 4);
    const message = compoundBurn ? `You are about to stake ${amount} Delta in the Deep Farming Vault` : `You are about to stake ${amount} Delta in the Deep Farming Vault without a "Burn Deposit". This will reduce your Multiplier from ${globalHooks.staking.info.booster}x to 1x. To prevent this please check the box Burn Deposit.`;

    const confirmed = await modalContext.showConfirm('Compound Staking', message);

    if (confirmed) {
      const transaction = yam.contracts.dfv.methods.compound(wallet.account);

      await transactions.executeTransaction(
        modalContext,
        transaction,
        { from: wallet.account },
        "Successfully compounded",
        "Compound",
        "Error while compounding"
      );

      globalHooks.staking.update();
      globalHooks.delta.update();

      return true;
    }
  };

  const allowanceRequiredFor = {
    contract: 'dfv',
    token: 'rLP'
  };

  return <div>
    <TokenInput className="mt-4" token="delta" buttonText="Stake" labelBottomClassName="text-xs text-gray-400" labelBottom="Deposit DELTA and earn yield" buttonTextLoading="Staking..." checkboxButton="Burn Deposit" checkboxButtonChecked onOk={onStake} allowanceRequiredFor={allowanceRequiredFor} />
    {globalHooks.staking.info.farmedDelta > 0 &&
      <>
        <div className="block md:flex md:flex-row mt-4">
          <DeltaButton className="block md:flex" onClick={() => onCompoundDeposit()}>Compound Deposit</DeltaButton>
          <CompoundBurnCheckbox className="block md:flex" />
        </div>
        <div className="text-sm text-gray-400 flex mt-1">Compound your stake by depositing your current rewards</div>
      </>}
  </div >
};

const RlpMinting = () => {
  const router = useRlpRouter();
  const [estimationLabel, setEstimationLabel] = useState('');
  const globalHooks = useContext(GlobalHooksContext);

  useEffect(() => {
    const text = `estimated rLP minted: ${formatting.getTokenAmount(router.estimatedRlpAmount, 0, 4)} ` +
      `rLP ➔ Gas cost: ${formatting.getTokenAmount(router.gasEstimation, 18, 4)} ETH `;
    setEstimationLabel(text);
  }, [router.estimatedRlpAmount, router.gasEstimation]);

  const onBuy = async (amount, amountBN, valid, autoStake) => {
    if (amount !== DATA_UNAVAILABLE) {
      router.setAutoStake(autoStake);
      return router.mint(amount, autoStake, false);
    }
    return true;
  };

  const onChange = async (amount, amountBN, valid, autoStake) => {
    router.setAutoStake(autoStake);

    if (amount !== DATA_UNAVAILABLE) {
      await router.setEthAmountOnly(amount);
    }
  };

  return <div>
    <ul className="list-disc list-inside py-4 md:py-8">
      <li>Deposit Ethereum to mint new rLP tokens</li>
      <li>Select stake automatically to immediately stake the new rLP in the Deep Farming Vault</li>
      <li>1 LP = {formatting.getTokenAmount(globalHooks.staking.rlpPerLp)} rLP</li>
    </ul>
    <TokenInput
      className="mt-4"
      token="ETH"
      buttonText="MINT"
      onChange={onChange}
      labelBottom={estimationLabel}
      buttonTextLoading="MINTING..."
      checkboxButton="Stake"
      checkboxButtonChecked={false}
      onOk={onBuy} />
  </div>;
};

const VaultDeposit = ({ token }) => {
  const [depositAction, setDepositAction] = useState(true);

  // eslint-disable-next-line consistent-return
  const renderContent = () => {
    switch (token) {
      case "rLP":
        if (depositAction) {
          return <RlpStaking />
        }
        return <RlpMinting />;
      case "delta":
        if (depositAction) {
          return <DeltaStaking />;
        }
        break;
      default:
        break;
    }
  };

  const renderBuyButton = (token) => {
    if (token === "rLP") {
      return <DeltaButton className="flex-1 md:flex-grow-0"
        onClick={() => setDepositAction(t => !t)}
        grayLook={depositAction}>MINT rLP</DeltaButton>
    }

    return <a className="flex-1 md:flex-grow-0" target="_blank" href={deltaUniswapUrl} rel="noopener noreferrer">
      <DeltaButton grayLook={depositAction}>BUY DELTA</DeltaButton>
    </a>;
  }

  return <div>
    <DeltaPanel className="flex items-center text-center flex-wrap">
      <div className="flex border border-black p-1 flex-grow md:flex-none">
        <DeltaButton className="flex-1 mr-2 md:flex-grow-0" onClick={() => setDepositAction(t => !t)} grayLook={!depositAction}>{token === 'rLP' ? 'Stake rLP' : 'Stake Delta'}</DeltaButton>
        {renderBuyButton(token)}
      </div>
    </DeltaPanel>
    {renderContent()}
  </div>;
};


/* const CreateWithdrawalContractContent = ({ token }) => {
  let message = 'This will automatically claim 3.543 ETH and start a Withdrawal contract for 3245 Delta.'
  if (token === 'delta') {
    message = `${message} And reduce your Reward Multiplier to 1x.`
  }

  // TODO: Read from web3
  const claimDelta = 123;
  const claimEth = 432;

  return <DeltaPanel>
    <div className="my-4 text-base">{message}</div>
    <div className="my-4 text-base">Current Reward Multiplier:</div>
    <div>Reward Multiplier</div>
    <div><ProgressBarDiamonds small value={10} maxValue={10} /></div>
    <div>Time until downgrade: 6 days 13 hours</div>
  </DeltaPanel>;
}
*/

const DeltaWithdrawal = ({ token }) => {
  const globalHooks = useContext(GlobalHooksContext);
  const modalContext = useContext(ModalContext);
  const router = useRouter()
  const yam = useYam();
  const wallet = useWallet();

  const onClaim = async () => {
    if (globalHooks.staking.info.compoundBurn === DATA_UNAVAILABLE) {
      return false;
    }

    let transaction = yam.contracts.dfv.methods.deposit(0, 0);
    if (globalHooks.staking.info.compoundBurn) {
      transaction = yam.contracts.dfv.methods.depositWithBurn(0);
    }

    await transactions.executeTransaction(
      modalContext,
      transaction,
      { from: wallet.account },
      "Successfully claimed",
      "Claim",
      "Error while claiming"
    );

    globalHooks.staking.update();
    globalHooks.delta.update();

    return Promise.resolve();
  };

  const onExit = async () => {
    const transaction = yam.contracts.dfv.methods.exit();

    await transactions.executeTransaction(
      modalContext,
      transaction,
      { from: wallet.account },
      "Successfully Unstaked",
      "Unstaking",
      "Error while unstaking"
    );


    globalHooks.staking.update();
    globalHooks.delta.update();
  };

  const onUnstakeDelta = async () => {
    const claimDelta = formatting.getTokenAmount(globalHooks.staking.info.farmedDelta, 18, 4);
    const claimEth = formatting.getTokenAmount(globalHooks.staking.info.farmedETH, 18, 4);
    const rlp = formatting.getTokenAmount(globalHooks.staking.info.rlp, 18, 4);
    const stakedDelta = formatting.getTokenAmount(globalHooks.staking.info.stakedDelta, 18, 4);

    const message = `This will automatically claim ${claimEth} ETH, ${claimDelta} DELTA, unstake ${rlp} rLP and create a withdrawal contract for ${stakedDelta} DELTA. Are you sure?`;

    const confirm = await modalContext.showConfirm('You are about to unstake everything', message);

    if (confirm) {
      await onExit();
    }
  };

  const seeWithdrawingContract = e => {
    e.preventDefault();
    router.push('/contracts');
  };

  return <div className="my-6">
    {token === 'delta' && <>
      <ul className="list-disc list-inside py-4 md:py-8">
        <li>Staked Delta: {formatting.getTokenAmount(globalHooks.staking.info.stakedDelta, 18, 4)} DELTA</li>
      </ul>
      <div className="flex p-1 flex-grow md:flex-none">
        <TransactionButton className="flex-1" text="Unstake All" onClick={() => onUnstakeDelta(token)} />
      </div>
    </>}
    <ul className="list-disc list-inside py-4 md:py-8">
      <li>Claimable Delta: {formatting.getTokenAmount(globalHooks.staking.info.farmedDelta, 18, 4)} DELTA</li>
    </ul>
    <div className="flex p-1 flex-grow md:flex-none">
      <TransactionButton className="flex-1 mr-2 md:flex-grow-0" disabled={globalHooks.staking.info.farmedDelta <= 0} text={globalHooks.staking.info.farmedDelta > 0 ? 'Claim' : 'Nothing to claim'} onClick={onClaim} />
      <DeltaButton className="flex-1 md:flex-grow-0" onClick={seeWithdrawingContract}>Show All Contracts</DeltaButton>
    </div>
  </div>
};

const EthereumWithdrawal = () => {
  const globalHooks = useContext(GlobalHooksContext);
  const yam = useYam();
  const wallet = useWallet();
  const modalContext = useContext(ModalContext);

  const onClaim = async () => {
    if (globalHooks.staking.info.compoundBurn === DATA_UNAVAILABLE) {
      return Promise.reject();
    }

    let transaction = yam.contracts.dfv.methods.deposit(0, 0);
    if (globalHooks.staking.info.compoundBurn) {
      transaction = yam.contracts.dfv.methods.depositWithBurn(0);
    }

    await transactions.executeTransaction(
      modalContext,
      transaction,
      { from: wallet.account },
      "Successfully claimed",
      "Claim",
      "Error while claiming"
    );

    globalHooks.staking.update();
    globalHooks.delta.update();

    return Promise.resolve();
  };

  return <div className="my-6">
    <ul className="list-disc list-inside py-4 md:py-8">
      <li>Claimable Ethereum: {formatting.getTokenAmount(globalHooks.staking.info.farmedETH, 18, 4)} ETH</li>
    </ul>
    <TransactionButton disabled={globalHooks.staking.info.farmedETH <= 0} text={globalHooks.staking.info.farmedETH > 0 ? 'Claim' : 'Nothing to claim'} textLoading="Claiming..." onClick={onClaim} />
  </div>
};

const RlpWithdrawal = () => {
  const modalContext = useContext(ModalContext);
  const globalHooks = useContext(GlobalHooksContext);
  const yam = useYam();
  const wallet = useWallet();

  const onUnstakDialog = async () => {
    const content = `This will withdraw ${formatting.getTokenAmount(globalHooks.staking.info.rlp, 18, 4)} rLP and automatically claim your farmed ETH and start a Withdrawal contract for your farmed DELTA.`;
    const confirm = await modalContext.showConfirm('You are about to unstake your rLP', content);

    if (confirm) {
      const transaction = yam.contracts.dfv.methods.withdrawRLP(globalHooks.staking.info.rlp.toString());

      await transactions.executeTransaction(
        modalContext,
        transaction,
        { from: wallet.account },
        "Successfully unstaked",
        "Unstake",
        "Error while unstaking"
      );

      globalHooks.staking.update();
      globalHooks.rlpInfo.update();
    }
  };

  return <div className="my-6">
    <ul className="list-disc list-inside py-4 md:py-8">
      <li>Staked rLP: {formatting.getTokenAmount(globalHooks.staking.info.rlp, 18, 4)} rLP</li>
    </ul>
    <TransactionButton disabled={globalHooks.staking.info.rlp <= 0} text={globalHooks.staking.info.rlp > 0 ? 'Unstake' : 'Nothing to unstake'} textLoading="Unstaking..." onClick={() => onUnstakDialog()} />
  </div>
};

const VaultWithdraw = ({ token }) => {
  const [tokenToWithdraw, setTokenToWithdraw] = useState('eth');

  const renderContent = (selectTokenToWithdraw) => {
    switch (selectTokenToWithdraw) {
      case 'eth':
        return <EthereumWithdrawal token={token} />
      case 'delta':
        return <DeltaWithdrawal token={token} />
      case 'rlp':
        return <RlpWithdrawal />
      default:
        return <></>;
    }
  };

  const renderButtons = () => {
    if (token === 'delta') {
      return <>
        <DeltaButton className="flex-1 mr-2 md:flex-grow-0" onClick={() => setTokenToWithdraw('eth')} grayLook={tokenToWithdraw !== 'eth'}>Ethereum</DeltaButton>
        <DeltaButton className="flex-1 md:flex-grow-0" onClick={() => setTokenToWithdraw('delta')} grayLook={tokenToWithdraw !== 'delta'}>Delta</DeltaButton>
      </>;
    }

    return <>
      <DeltaButton className="flex-1 mr-2 md:flex-grow-0" onClick={() => setTokenToWithdraw('eth')} grayLook={tokenToWithdraw !== 'eth'}>Ethereum</DeltaButton>
      <DeltaButton className="flex-1 mr-2 md:flex-grow-0" onClick={() => setTokenToWithdraw('delta')} grayLook={tokenToWithdraw !== 'delta'}>Delta</DeltaButton>
      <DeltaButton className="flex-1 md:flex-grow-0" onClick={() => setTokenToWithdraw('rlp')} grayLook={tokenToWithdraw !== 'rlp'}>rLP</DeltaButton>
    </>;
  };

  return <div>
    <DeltaPanel className="flex items-center text-center flex-wrap">
      <div className="flex border border-black p-1 flex-grow md:flex-none">
        {renderButtons()}
      </div>
    </DeltaPanel>
    <DeltaPanel>
      {renderContent(tokenToWithdraw)}
    </DeltaPanel>
  </div>;
};

const VaultStaking = ({ token, className = '' }) => {
  const [depositAction, setDepositAction] = useState(true);

  return <DeltaPanel className={`pt-2 border-t-2 mt-4 border-dashed border-black ${className}`}>
    <div className="flex uppercase" onClick={() => setDepositAction(t => !t)}>
      <div className="flex flex-grow" />
      <div className="flex self-end select-none cursor-pointer text-sm">
        <div className={`${!depositAction ? 'text-gray-300' : 'text-black'}`}>Deposit</div>
        <div className="px-1">/</div>
        <div className={`${depositAction ? 'text-gray-300' : 'text-black'}`}>Withdraw</div>
      </div>
    </div>
    <div className="mt-4 md:mt-1">
      {depositAction ? <VaultDeposit token={token} /> : <VaultWithdraw token={token} />}
    </div>
  </DeltaPanel>
};

export default VaultStaking;

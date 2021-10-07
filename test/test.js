const web3 = require('web3');
const {accounts, contract} = require('@openzeppelin/test-environment');
const {BN, expectRevert, time, expectEvent, constants} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const Token = contract.fromArtifact('Token');
const ctx = contract.fromArtifact('PreSale');
const startBlock = 0;
const endBlock = 1999999999;
let dev, user, fee;
let amount, ratio, pAPOLLOPrice, IRISPrice;
function fromWei( v ){
    if( ! v ) return '-';
    return web3.utils.fromWei(v, 'ether').toString();
}
function toWei( v ){
    return web3.utils.toWei(v);
}
describe('ctx', function () {
    beforeEach(async function () {
        dev = accounts[0];
        user = accounts[1];
        fee = accounts[2];
        amount = web3.utils.toWei('10000');
        this.Token = await Token.new({from: dev});
        this.Final = await Token.new({from: dev});
        this.usdc = await Token.new({from: dev});
        this.iris = await Token.new({from: dev});
    });
    describe('buy', function () {
        it('PRESALE 50%/$1.2/$0.7', async function () {
            this.timeout(60000);

            ratio = '50'; // 50%
            pAPOLLOPrice = '120'; // 1.0
            IRISPrice = '70'; // 0.70
            this.ctx = await ctx.new(startBlock, endBlock, ratio, pAPOLLOPrice, IRISPrice,
                this.Token.address, this.iris.address, this.usdc.address, {from: dev});
            await this.ctx.setFeeAddress(fee, {from: dev});

            const pAPOLLO_first_round = toWei('46875');

            await this.Token.mint(this.ctx.address, pAPOLLO_first_round, {from: dev});

            await this.usdc.mint(dev, amount, {from: dev});
            await this.iris.mint(dev, amount, {from: dev});

            await this.usdc.approve(this.ctx.address, toWei('10000'), {from: dev});
            await this.iris.approve(this.ctx.address, toWei('10000'), {from: dev});

            let quote = toWei('1000');
            let quoteAmounts = await this.ctx.quoteAmounts(quote, dev);

            const price = pAPOLLOPrice/100;
            const irisPrice = IRISPrice/100;
            console.log('1) User want to buy '+fromWei(quoteAmounts.tokenPurchaseAmount)+' of '+fromWei(quoteAmounts.limit)+' pApollo at $'+price  );
            console.log('Total to be paid in USD: $'+fromWei(quoteAmounts.pAppoloInUSD));
            console.log('- Sub-total to be paid in USDC ('+ratio+'%)', fromWei(quoteAmounts.inUsdc));
            console.log('- Sub-total to be paid in IRIS ($'+irisPrice+')', fromWei(quoteAmounts.amountIRIS));

            await this.ctx.buy(quote, {from: dev});

            let pApolloBalanceOfDevAddr = await this.Token.balanceOf(dev);
            let usdcBalanceOfTaxAddr = await this.usdc.balanceOf(fee);
            let irisBalanceOfTaxAddr = await this.iris.balanceOf(fee);

            expect(pApolloBalanceOfDevAddr).to.be.bignumber.equal(quote);
            expect(usdcBalanceOfTaxAddr).to.be.bignumber.equal(quoteAmounts.inUsdc);
            expect(irisBalanceOfTaxAddr).to.be.bignumber.equal(quoteAmounts.amountIRIS);

            quote = toWei('5000');
            quoteAmounts = await this.ctx.quoteAmounts(quote, dev);
            console.log('2) User want to buy '+fromWei(quoteAmounts.tokenPurchaseAmount)+' of '+fromWei(quoteAmounts.limit)+' pApollo at $'+price  );
            console.log('Total to be paid in USD: $'+fromWei(quoteAmounts.pAppoloInUSD));
            console.log('- Sub-total to be paid in USDC ('+ratio+'%)', fromWei(quoteAmounts.inUsdc));
            console.log('- Sub-total to be paid in IRIS ($'+irisPrice+')', fromWei(quoteAmounts.amountIRIS));

            await this.ctx.buy(quote, {from: dev});

            pApolloBalanceOfDevAddr = await this.Token.balanceOf(dev);
            expect(pApolloBalanceOfDevAddr).to.be.bignumber.equal( toWei('4000') );
            console.log('User pApollo balance: '+fromWei(pApolloBalanceOfDevAddr));

            await this.Final.mint(this.ctx.address, pAPOLLO_first_round, {from: dev});
            await this.Token.approve(this.ctx.address, toWei('10000'), {from: dev});
            let getBlock = (await this.ctx.getBlock()).toString();
            await this.ctx.setStartEndBlock(startBlock, getBlock, {from: dev});
            const swapStartBlock = parseInt(getBlock) + 1;
            const swapEndBlock = swapStartBlock + 10;
            await this.ctx.setSwapStart(swapStartBlock, swapEndBlock, this.Final.address, {from: dev});
            await this.ctx.swapAll({from: dev});

            console.log('getBlock', getBlock, swapStartBlock, swapEndBlock);
            const tempBalanceOfDevAddr = await this.Token.balanceOf(dev);
            const finalBalanceOfDevAddr = await this.Final.balanceOf(dev);
            expect(tempBalanceOfDevAddr).to.be.bignumber.equal( new BN('0') );
            expect(finalBalanceOfDevAddr).to.be.bignumber.equal( toWei('4000') );
            console.log('User token balance: '+fromWei(finalBalanceOfDevAddr));

            getBlock = (await this.ctx.getBlock()).toString();
            await this.ctx.setSwapStart(swapStartBlock, getBlock, this.Final.address, {from: dev});
            await this.ctx.burnUnclaimed({from: dev});

            // await this.ctx.setSwapStart(quote, {from: dev});

        });


        it('PRESALE 80%/$2/$0.7', async function () {
            this.timeout(60000);

            ratio = '80'; // 80%
            pAPOLLOPrice = '200'; // 2.0
            IRISPrice = '70'; // 0.70
            this.ctx = await ctx.new(startBlock, endBlock, ratio, pAPOLLOPrice, IRISPrice,
                this.Token.address, this.iris.address, this.usdc.address, {from: dev});
            await this.ctx.setFeeAddress(fee, {from: dev});

            await this.ctx.setUserIsPantheon(dev, true, {from: dev});
            await this.ctx.setUserIsHeroes(dev, true, {from: dev});

            const pAPOLLO_first_round = toWei('78125');

            await this.Token.mint(this.ctx.address, pAPOLLO_first_round, {from: dev});
            await this.usdc.mint(dev, amount, {from: dev});
            await this.iris.mint(dev, amount, {from: dev});

            await this.usdc.approve(this.ctx.address, toWei('10000'), {from: dev});
            await this.iris.approve(this.ctx.address, toWei('10000'), {from: dev});

            let quote = toWei('1000');
            let quoteAmounts = await this.ctx.quoteAmounts(quote, dev);

            const price = pAPOLLOPrice/100;
            const irisPrice = IRISPrice/100;
            console.log('1) User want to buy '+fromWei(quoteAmounts.tokenPurchaseAmount)+' of '+fromWei(quoteAmounts.limit)+' pApollo at $'+price  );
            console.log('Total to be paid in USD: $'+fromWei(quoteAmounts.pAppoloInUSD));
            console.log('- Sub-total to be paid in USDC ('+ratio+'%)', fromWei(quoteAmounts.inUsdc));
            console.log('- Sub-total to be paid in IRIS ($'+irisPrice+')', fromWei(quoteAmounts.amountIRIS));

            await this.ctx.buy(quote, {from: dev});

            let pApolloBalanceOfDevAddr = await this.Token.balanceOf(dev);
            let usdcBalanceOfTaxAddr = await this.usdc.balanceOf(fee);
            let irisBalanceOfTaxAddr = await this.iris.balanceOf(fee);

            expect(pApolloBalanceOfDevAddr).to.be.bignumber.equal(quote);
            expect(usdcBalanceOfTaxAddr).to.be.bignumber.equal(quoteAmounts.inUsdc);
            expect(irisBalanceOfTaxAddr).to.be.bignumber.equal(quoteAmounts.amountIRIS);

            quote = toWei('5000');
            quoteAmounts = await this.ctx.quoteAmounts(quote, dev);
            console.log('2) User want to buy '+fromWei(quoteAmounts.tokenPurchaseAmount)+' of '+fromWei(quoteAmounts.limit)+' pApollo at $'+price  );
            console.log('Total to be paid in USD: $'+fromWei(quoteAmounts.pAppoloInUSD));
            console.log('- Sub-total to be paid in USDC ('+ratio+'%)', fromWei(quoteAmounts.inUsdc));
            console.log('- Sub-total to be paid in IRIS ($'+irisPrice+')', fromWei(quoteAmounts.amountIRIS));

            await this.ctx.buy(quote, {from: dev});

            pApolloBalanceOfDevAddr = await this.Token.balanceOf(dev);
            expect(pApolloBalanceOfDevAddr).to.be.bignumber.equal( toWei('6000') );
            console.log('User pApollo balance: '+fromWei(pApolloBalanceOfDevAddr));


            await this.Final.mint(this.ctx.address, pAPOLLO_first_round, {from: dev});
            await this.Token.approve(this.ctx.address, toWei('10000'), {from: dev});
            let getBlock = (await this.ctx.getBlock()).toString();
            await this.ctx.setStartEndBlock(startBlock, getBlock, {from: dev});
            const swapStartBlock = parseInt(getBlock) + 1;
            const swapEndBlock = swapStartBlock + 10;
            await this.ctx.setSwapStart(swapStartBlock, swapEndBlock, this.Final.address, {from: dev});
            await this.ctx.swapAll({from: dev});

            console.log('getBlock', getBlock, swapStartBlock, swapEndBlock);
            const tempBalanceOfDevAddr = await this.Token.balanceOf(dev);
            const finalBalanceOfDevAddr = await this.Final.balanceOf(dev);
            expect(tempBalanceOfDevAddr).to.be.bignumber.equal( new BN('0') );
            expect(finalBalanceOfDevAddr).to.be.bignumber.equal( toWei('6000') );
            console.log('User token balance: '+fromWei(finalBalanceOfDevAddr));

            getBlock = (await this.ctx.getBlock()).toString();
            await this.ctx.setSwapStart(swapStartBlock, getBlock, this.Final.address, {from: dev});
            await this.ctx.burnUnclaimed({from: dev});

        });

    });

});

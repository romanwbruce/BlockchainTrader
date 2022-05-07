let name = "!!!";
let prefix = "["+name+" v0.0.3] ";

const { Console } = require('console');
const { resolveNaptr } = require('dns');
const { exit } = require('process');

const key          = 'removed' // API Key
const secret       = 'removed'; // API Private Key

Kraken = require('kraken-exchange');

const kraken = new Kraken(key, secret);

let price = 0.0000;
let history = [];

function set_price(eth_usd){
    price = eth_usd;
    view("current-price", price);
}

let max_history = 100;

function query_price(){
    let price = 0.0000000;
     kraken.ticker('ETHUSD')
    .then(response => {
        set_price(response['ETHUSD']['c'][0]);
    })
    .catch(err => console.error(prefix+err));
    return price;
}

function safe_to_trade(){
    if( !(history.length > 20) ){
        return false;
    }

    let tot_chg = 0.0;
    let vals = 0;
    for (let i = 0; i < history.length; i++) {
        chn = Math.abs(history[i] - history[i+1]);
        tot_chg += chn;
        vals++;
    }

    let avg = tot_chg / vals;

    if(avg >= 20){
        console.log("Avg price change is more than $20.000 unsafe to micro trade right now. #"+avg);
        return false;
    }

    return false;
}

function update_history(){
    if(price!=0)
        history.push(price);
    if(history.length > max_history){
        history.pop();
    }
}

//Session Details
let session_profit = 0.0000;
let loss_msgs = 0;

//Current Transaction Values
let amount = 0.0;
let usd = 0.0;
let trade_price = 0.0;
let in_trade = false;
let time_in_transaction = 0;
let now_loss = 0.0;
let losses = 0;

//Baseline Trading Values
let baseline = 1.0;
let tolerance = 30.0;
let sell_margin = .2;

//Update Rate in ms
let rate = 250;

function buy(around_this){
    in_trade = true;
    trade_price = around_this;

    kraken.ticker('ETHUSD')
    .then(response => {
        let __NOW__ = response['ETHUSD']['c'][0];
        amount = usd / __NOW__;
        console.log("Amount (ETH): "+amount);

        kraken.addOrder("ETHUSD", "buy", "market", amount, null, null, null, 'fciq', null, null, null, null, null, null, null).then(response=>{
            console.log("Buy response: "+response);
        }).catch(err =>{
            console.error("Buy error:"+ err);
            exit(0);
        });

    })
    .catch(err => console.error(err));
}

function view(id, text){

}

function sell(){
    time_in_transaction = 0;
    let eth_prof = price - trade_price;
    session_profit += eth_prof;
}

function trade(){
    if(!safe_to_trade()){
        return;
    }

    history.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
    low = history[0];
    high = history[history.length - 1];

    baseline = low;

    if(!in_trade){
        if( (price - low) < tolerance ){
            //Buy
            buy(price);
            console.log(prefix+"Attempting to buy at around: " + price);
        }
    }else{
        time_in_transaction++;

        if (price > (trade_price + sell_margin)) {
            console.log(prefix+"Selling at "+price+" (Exceeded sell margin)");
            sell();
            in_trade = false;
            trade_price = 0.0;
        }
        if(price < trade_price){
            ++loss_msgs;
            if(loss_msgs % 10 == 0){
                now_loss = Math.abs(trade_price - price);
                console.log(prefix+"Loss @ -"+now_loss+", price="+price);

            }
            now_loss = Math.abs(trade_price - price);

            if(now_loss > 1.5){
                losses++;
            }

            if(now_loss > 10 || losses > 4){
                console.log(prefix+"Selling at "+price+" (Loss Conditions Met)");
                sell();
                in_trade = false;
                trade_price = 0.0;
                loss_msgs = 0;
                now_loss = 0;
                losses = 0;
            }
        }

        if(time_in_transaction > 175){
            console.log(prefix+"Selling at "+price+" (Exceeded time in transaction limit...)");
            sell();
            in_trade = false;
            loss_msgs = 0;
            trade_price = 0.0;
            now_loss = 0;
            losses = 0;
        }
    }

}

function trade_loop(){
    setTimeout(
    function(){
        trade_loop();
        query_price();
        setTimeout(
            async function(){
                update_history();
        }, 10);

        trade();

    }, rate);
}

function main(){

    setTimeout(
        function(){

    console.log("romanbruce.com");
    console.log(prefix+"Starting...");

    kraken.balance()
    .then(response => {
        if(response[0]==undefined){
            console.log(prefix+"No balance");
        }else{
        console.log(prefix+response[0]);
        }
    })
    .catch(err => console.error(prefix+err));



    trade_loop();

}

main();

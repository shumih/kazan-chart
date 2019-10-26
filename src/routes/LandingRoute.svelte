<script>
  const messages = [
    'Проходите опрос и получайте гарантированные подарки от наших спонсоров',
    'После подведения итогов переписки Вас будет возможность просмотра результатов',
  ];
</script>

<style>
  .container {
    display: grid;
    grid-template-columns: 64px 960px 1fr;
    grid-template-rows: 600px 1fr;
    margin: 16px;
  }

  .text {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    align-self: center;
  }

  img {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
    align-self: center;
    justify-self: center;
  }

  .text {
    font-family: Gilroy Extra Bold;
    font-size: 80px;
    line-height: 98px;
  }

  .messages {
    grid-column: 3 / 4;
    grid-row: 2 / 3;
    display: flex;
    flex-direction: column;
    justify-self: center;
  }

  .message {
    width: 600px;
    padding: 24px;
    text-align: center;
    background: #e5e5e5;
    border-radius: 30px;
    font-family: Pragmatica;
    font-size: 18px;
    color: #767676;
    margin-bottom: 16px;
  }

  .be-apart {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    width: 320px;
    height: 76px;
    line-height: 76px;
    background: #ff4f4f;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
    border-radius: 30px;

    font-family: Pragmatica;
    font-size: 20px;
    line-height: 18px;
    text-transform: uppercase;
    color: #fff;
  }
</style>

<div class="container">

  <p class="text">
    Участвуй
    <br />
    в переписи населения -
    <br />
    узнай, насколько
    <br />
    <span class="pink">ты уникален</span>
  </p>

  <button class="be-apart" type="button" on:click={() => window.location.replace('https://kazan-poll.firebaseapp.com')}>
    Участвовать в опросе
  </button>

  <img src="./images/guys.png" alt="guys" width="440px" height="440px" />

  <div class="messages">
    {#each messages as message}
      <div class="message">{message}</div>
    {/each}
  </div>
</div>

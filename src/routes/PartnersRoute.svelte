<script>
  const messages = [
    'Проходите опрос и получайте гарантированные подарки от наших спонсоров',
    'После подведения итогов переписки Вас будет возможность просмотра результатов',
  ];
</script>

<style>
  .container {
    margin: 16px;
  }

  .text {
    font-family: Gilroy Extra Bold;
    font-size: 32px;
  }

  .be-apart {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    width: 320px;
    height: 64px;
    line-height: 64px;
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
    Для участия в партнерской программе отправьте вашу заявку с подробным описанием вашей компании на нашу рабочую почту
    и мы обязательно с Вами свяжемся.
  </p>

  <button class="be-apart" type="button" on:click={() => window.location.replace('https://kazan-poll.firebaseapp.com')}>
    Оставить заявку
  </button>
</div>

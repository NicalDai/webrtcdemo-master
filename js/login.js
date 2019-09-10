
window.onload = function () {
  var accountText = document.getElementById("account");
  var tokenText = document.getElementById("secret");
  var loginBtn = document.getElementById("loginBtn");

  loginBtn.onclick = function () {
      var accid = accountText.value;
      var token = MD5(tokenText.value);

      if (accid === '' || token === ''){
          alert("accid or token is empty！");
      } else {
          setCookie("accid",accid);
          setCookie("token",token);
          window.location.href = './main.html';
      }
  }
};
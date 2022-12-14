

<!-- PROJECT LOGO -->
<br />
<div align="center">

  <h3 align="center">PBS Bank API</h3>

  <p align="center">
    Sprawdź stan swojego konta w banku spółdzielczym
    <br />
    <a href="https://panel.sim-app.ovh"><strong>WWW.LETSCODE.IT</strong></a>
    
  </p>
</div>

<br><br>


<!-- ABOUT THE PROJECT -->
## About The Project

Jeśli jesteś programistą i potrzebujesz powiadomień o stanie konta w swoim Banku Spółdzielczym to jest to coś dla Ciebie.
Wystarczy wysyłać zapytanie "get_data" na które dostaniesz odpowiedź w formie json ze stanem konta itp.
Przetestuj i sprawdź :)
Oczywiście kod jest w pełni do wglądu. Zalecam uruchomić program przez docker compose, bo jest to już w pełni przygotowane. Aplikacja w nodejs używa biblioteki puppetter do web scrapingu, a ta natomist wymaga zainstalowanego Chromium. Tak więc dużo prościej będzie Ci zbudować ten kontener :)



### Built With

* ![Docker][Docker]



<!-- GETTING STARTED -->
## Jak zacząć

Pobierz program i uruchom używając polecenia:

```bash
docker-compose up
```

<!-- USAGE EXAMPLES -->
## Usage

Po uruchomieniu aplikacja jest dostępna tutaj: ```http://localhost:9981```



_Teraz użyj curl w konsoli lub innym języku by przejść pierwsze krokia_

1. Zaloguj się do banku
```bash
http://localhost:9981/login -d login=LOGIN -d password=HASLO
```
Jeśli otrzymasz "login_status": -2 oznacza to, że prawdopodobnie dane logowania są błędne. W przypadku trzymania wartości "2" jesteś już zalogowany. 
Nas interesuje "login_status": 0. Wtedy powinniśmy otrzymać na przypisany do konta bankowego numer telefonu kod weryfikacyjny, który przyda nam się w kroku 2.


2. Podaj kod weryfikacyjny otrzymany na telefon
```bash
http://localhost:9981/sms_code -d login=LOGIN -d password=HASLO -d pin=WPISZ_KOD
```
Jeśli otrzymamy teraz "login_status": 1 to nasz kod jest prawidłowy. Jeśli -1 to nieprawidłowy. Jeśli -2, to dane logowania są błedne, bo musimy je wysyłać w każdym zapytaniu.

3. Jeśli w kroku 2 podaliśmy prawidłowy kod, to możemy teraz pobrać json z naszym stanem konta.
```bash
http://localhost:9981/get_data -d login=LOGIN -d password=HASLO
```

4. Powtarzaj krok 3 za każdym razem, gdy chcesz pobrać stan konta. Sesja logowania nie powinna przepaść do ponownego uruchmienia programu. Gdy jednak przepadnie, zerknij na kilka informacji niżej.

## Dodatkowo
Po ponownym uruchmieniu aplikacji sesja logowania przepada, ale nasze urządzenie jest zapamiętane i nie musimy ponownie logować się weryfikując kodem pin.
Spróbuj wtedy podjąć próbę logowania bez wysyłania kodu pin na telefon. Jeśli to się nie uda, po prostu rozpocznij spowrotem od kroku 1.
```bash
http://localhost:9981/try_login -d login=LOGIN -d password=HASLO -d
```

Możesz również pobrać base64 obrazka, którym jest zrzut ekranu ze strony bankowej :)
```bash
http://localhost:9981/get_print_screen -d login=LOGIN -d password=HASLO -d
```


<!-- CONTACT -->
## Contact

[Let's Code It](https://www.letscode.it), [Karol Sójka](https://facebook.com/Fadeusz) from Poland - kontakt@letscode.it



### Bezpieczeństwo

W celu podtrzymania sesji logowania program przechowuje pliki cookies przeglądarki w udostępnionym w dockerze katalogu /cookies
Są to oczywiście Twoje lokalne pliki, ale miej na uwadze, że takie dane są u Ciebie zapisane i nie uruchamiaj po prostu tego porogramowania w niepewnym środkwisku, na niezaufanym serwerze itp.


[Docker]: https://img.shields.io/badge/Docker-blue?style=for-the-badge&logo=docker&logoColor=white
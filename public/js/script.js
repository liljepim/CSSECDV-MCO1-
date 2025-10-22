$(document).ready( function() {
    // let isLoggedIn = sessionStorage.getItem('isLoggedIn');
    // if(isLoggedIn === null){
    //     isLoggedIn = 0;
    //     sessionStorage.setItem('isLoggedIn',isLoggedIn);
    // }

    // // Put selectors here for elements restricted to registered users
    // const registeredElements = ['.drop-down', '.cta.compose', '.helpfulornot'];

    // // Put selectors here for elements restricted to unregistered users
    // const unregisteredElements = ['#left-nav #buttons'];

    // checkLoggedIn();
    // console.log(isLoggedIn);

    // function hideShow(hide, show) {
    //     // Hide the following elements
    //     hide.forEach(function(element) {
    //         $(element).css({'visibility': 'hidden', 'pointer-events': 'none'});
    //     })

    //     // Show the following elements
    //     show.forEach(function(element) {
    //         $(element).css({'visibility': 'visible', 'pointer-events': 'auto'});
    //     });

    // }

    // function checkLoggedIn() {
    //     if (isLoggedIn == 1){
    //         hideShow(unregisteredElements, registeredElements)
    //     }
    //     else {
    //         hideShow(registeredElements, unregisteredElements)
    //     }
    // }


    // function redirectTo(path) {
    //     window.location.href = path;
    // }
    
   
    // $("#login-form").on("submit", function(event) {
    //     isLoggedIn = 1;
    //     sessionStorage.setItem('isLoggedIn', isLoggedIn);
    //     checkLoggedIn();
    //     event.preventDefault();
    //     redirectTo("restos.html");
    // });

    // $("#logout-btn").click(function() {
    //     isLoggedIn = 0;
    //     sessionStorage.setItem('isLoggedIn', isLoggedIn);
    //     checkLoggedIn();
    // })

    // $(".logout-button").click(function() {
    //     isLoggedIn = 0;
    //     sessionStorage.setItem('isLoggedIn', isLoggedIn);
    //     checkLoggedIn();
    //     redirectTo("index.html");
    // })

    // $(".cta.compose").click(function() {
    //     if(isLoggedIn == 1){
    //         redirectTo("compose.html");
    //     } else {
    //         redirectTo("register.html");
    //     }
    // })

    // $(".search-form").on('submit', function(event) {
    //     event.preventDefault();
    //     var requestBody = $('.search-text').val();
    //     console.log(requestBody);
    //     if(requestBody === "" || requestBody === null){
    //         alert('Search value cannot be empty. Try again.');
    //         console.log('false');
    //     }

    //     $.post('/search', {searchText: requestBody}, (data) =>  {
    //         document.close();
    //         document.write(data);
    //         document.open();
    //     });
    // })

    $("input[type=radio][name=rating]").unbind('click').on('click', (event) => {
        let req = new XMLHttpRequest();
        let newUrl = window.location.href + "&rating=" +$('input[type=radio][name=rating]:checked').val()
        console.log(newUrl)
        req.open('GET', newUrl)
        
        req.onload = () => {
            console.log(req.response)
            document.open();
            document.write(req.response);
            document.close();
        }
        req.send()
        
    })
    $(".clear-button").unbind("click").on('click', (event) => {
        event.preventDefault()
        let req = new XMLHttpRequest();
        req.open('GET', window.location.href)
        
        req.onload = () => {
            console.log(req.response)
            document.open();
            document.write(req.response);
            document.close();
        }
        req.send()
    })

    $("#fileInput").on('change', (event) => {
        let file = event.target.files[0]
        let reader = new FileReader();
        reader.onloadend = () => {
            $(".main-icon").css('background-image', 'url("' + reader.result + '")')
            $(".main-icon").css('background-size', 'cover')
            $(".main-icon").css('background-repeat', 'no-repeat')
        }
        if(file){
            reader.readAsDataURL(file)
        }
       
    })
})
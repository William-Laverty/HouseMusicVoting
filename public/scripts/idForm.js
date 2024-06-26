document.getElementById('usernameForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const lastName = document.getElementById('lastName').value;

    const logoNavbar = document.getElementById('logoNavbar');
    const usernameForm = document.getElementById('usernameForm');

    usernameForm.style.opacity = 0;
    
    setTimeout(() => {
        usernameForm.classList.add('hidden');
        logoNavbar.classList.remove('hidden');
        setTimeout(() => {
            logoNavbar.style.opacity = 1;
            logoNavbar.style.transform = 'translate(-50%, -50%) scale(1.2)';
            
            setTimeout(() => {
                logoNavbar.style.opacity = 0;

                setTimeout(() => {
                    fetch('https://3.107.27.254:443/verify-user', { 
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, lastName })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            localStorage.setItem('username', username);
                            localStorage.setItem('name', data.name);
                            localStorage.setItem('isAdmin', data.isAdmin);

                            if (!data.isAdmin) {
                                window.location.href = 'html/poll.html'; 
                            } else {
                                window.location.href = 'html/admin.html';
                            }
                        } else {
                            alert(data.message);
                            usernameForm.classList.remove('hidden');
                            usernameForm.style.opacity = 1;
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        usernameForm.classList.remove('hidden');
                        usernameForm.style.opacity = 1;
                    });
                }, 2000);
            }, 2000); 
        }, 50); 
    }, 2000);
});

document.addEventListener('DOMContentLoaded', function() {
    const heroCover = document.getElementById('heroCover');
    const logoNavbar = document.getElementById('logoNavbar');
    const usernameForm = document.getElementById('usernameForm');
    const formLogo = document.querySelector('.form-logo');

    heroCover.style.opacity = 1;

    setTimeout(() => {
        logoNavbar.style.opacity = 1;
        logoNavbar.style.transform = 'translate(-50%, -50%) scale(2)';
    }, 2000);
    
    setTimeout(() => {
        logoNavbar.style.opacity = 0;
        setTimeout(() => {
            logoNavbar.classList.add('hidden');
            usernameForm.classList.remove('hidden');
            setTimeout(() => {
                usernameForm.style.opacity = 1;
            }, 50);
            formLogo.style.opacity = 1;
        }, 2000); 
    }, 4000);    
});

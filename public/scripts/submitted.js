document.addEventListener('DOMContentLoaded', function() {
    const event = localStorage.getItem('currentEvent').toLowerCase();
    if (event) {
        document.getElementById('welcomeMessage').textContent = `Your vote for ${event} has been submitted!`;
    } else {
        window.location.href = 'index.html'; // Redirect back if no 
    }
});
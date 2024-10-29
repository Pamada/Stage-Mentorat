<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $firstName = htmlspecialchars($_POST['first-name']);
    $lastName = htmlspecialchars($_POST['last-name']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $details = htmlspecialchars($_POST['details']);

    $to = "dana3pal@gmail.com";
    $subject = "Contact Form Submission from $firstName $lastName";
    $message = "First Name: $firstName\n";
    $message .= "Last Name: $lastName\n";
    $message .= "Email: $email\n";
    $message .= "Phone: $phone\n";
    $message .= "Details:\n$details\n";
    $headers = "From: $email";

    if (mail($to, $subject, $message, $headers)) {
        echo "<script>alert('Your message has been sent successfully!'); window.location.href = '/contact';</script>";
    } else {
        echo "<script>alert('There was an error sending your message. Please try again later.'); window.history.back();</script>";
    }
}
?>

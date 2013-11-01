<?php
/**
 * @author AlexanderC <self@alexanderc.me>
 * @date 10/31/13
 * @time 12:13 PM
 */

if(!isset(
    $_REQUEST['image'],
    $_REQUEST['name'],
    $_REQUEST['size'], $_REQUEST['size']['width'], $_REQUEST['size']['height'])) {
    throw new \RuntimeException("No image, name or size provided");
}

$data = base64_decode(preg_replace("#^data:image/[a-z]+;base64,#", "", $_REQUEST['image']));
$name = trim($_REQUEST['name']);
$size = $_REQUEST['size'];
$storage = __DIR__ . '/images/';

$allowedExtensions = array('jpg', 'jpeg', 'gif', 'png');

$extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));

if(!in_array($extension, $allowedExtensions)) {
    throw new \RuntimeException("Invalid file extension");
}

$file = sprintf("%s/%s-%s.%s", $storage, md5($name), md5(microtime(true)), $extension);

if(!file_put_contents($file, $data, LOCK_EX | LOCK_NB)
    && resizeImg($file, (int) $size['width'], (int) $size['height'])) {
    throw new \RuntimeException("Unable to persist file");
}

exit(json_encode(array('src' => sprintf('engine/images/%s', basename($file)))));


// ------------------------------ additional functions ----------------------------- //

/**
 * @param string $image
 * @param int $newwidth
 * @param int $newheight
 * @return bool
 */
function resizeImg($image, $newwidth, $newheight){
    list($width, $height) = getimagesize($image);
    if($width > $height && $newheight < $height){
        $newheight = $height / ($width / $newwidth);
    } else if ($width < $height && $newwidth < $width) {
        $newwidth = $width / ($height / $newheight);
    } else {
        $newwidth = $width;
        $newheight = $height;
    }
    if(preg_match("/.jpg/i", $image)){
        $source = imagecreatefromjpeg($image);
    }
    if(preg_match("/.jpeg/i", $image)){
        $source = imagecreatefromjpeg($image);
    }
    if(preg_match("/.png/i", $image)){
        $source = imagecreatefrompng($image);
    }
    if(preg_match("/.gif/i", $image)){
        $source = imagecreatefromgif($image);
    }
    $thumb = imagecreatetruecolor($newwidth, $newheight);
    imagecopyresized($thumb, $source, 0, 0, 0, 0, $newwidth, $newheight, $width, $height);

    if(preg_match("/.jpg/i", $image)){
        return imagejpeg($thumb, $image, 100);
    }
    if(preg_match("/.jpeg/i", $image)){
        return imagejpeg($thumb, $image, 100);
    }
    if(preg_match("/.jpeg/i", $image)){
        return imagejpeg($thumb, $image, 100);
    }
    if(preg_match("/.png/i", $image)){
        return imagepng($thumb, $image, 100);
    }
    if(preg_match("/.gif/i", $image)){
        return imagegif($thumb, $image, 100);
    }
}

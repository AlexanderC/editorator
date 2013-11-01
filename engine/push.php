<?php
/**
 * @author AlexanderC <self@alexanderc.me>
 * @date 10/31/13
 * @time 12:13 PM
 */

if(!isset($_REQUEST['items'])) {
    throw new \RuntimeException("No items provided");
}

$items = $_REQUEST['items'];
$storage = sys_get_temp_dir() . '/editorator.storage.tmp';

if(!is_file($storage)) {
    file_put_contents($storage, serialize(array()), LOCK_EX | LOCK_NB);
}

if(file_put_contents($storage, serialize($items + unserialize(file_get_contents($storage))), LOCK_EX | LOCK_NB)) {
    exit(json_encode(array('ok' => true)));
} else {
    exit(json_encode(array('ko' => true)));
}
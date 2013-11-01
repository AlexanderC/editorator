<?php
/**
 * @author AlexanderC <self@alexanderc.me>
 * @date 10/31/13
 * @time 12:12 PM
 */

//exit(
//strip_tags(json_decode(file_get_contents("http://randomtext.me/api/lorem/ul-10/5-10/"), true)['text_out'])
//. "<a href='http://google.com'> --> google link!</a> for " . $_REQUEST['item-id']);

if(!isset($_REQUEST['item-id'])) {
    throw new \RuntimeException("Item key is not provided");
}

$storage = sys_get_temp_dir() . '/editorator.storage.tmp';

if(!is_file($storage)) {
    file_put_contents($storage, serialize(array()), LOCK_EX | LOCK_NB);
}

$key = $_REQUEST['item-id'];
$db = unserialize(file_get_contents($storage));
$data = array_key_exists($key, $db) ? $db[$key] : "";


exit($data);